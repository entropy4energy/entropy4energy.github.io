"""Browser checks of the two sides of the CHAOS overview: the public face, which
shows and links to nothing behind the sign-in, and the signed-in side, which
chaos-members.js adds after the gate accepts the visitor. Made-up answers only.

    make && python tests/test_chaos_face.py --dist dist
"""
import argparse
import functools
import json
import re
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

from test_chaos_systems import Handler

WIDTHS = [320, 375, 600, 768, 800, 1024, 1100, 1440]
BEHIND = re.compile(r"chaos-systems|chaos-materials|chaos-hull|chaos-pairs|chaos/agent")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, required=True)
    parser.add_argument("--screenshots", type=Path)
    args = parser.parse_args()
    dist = args.dist.resolve()
    checks = []

    def check(ok, label):
        if not ok:
            raise AssertionError(label)
        checks.append(label)

    # the built pages: nothing behind the sign-in in what every visitor receives
    built = dist / "chaos.html"
    html = re.sub(r"<script\b.*?</script>", "", built.read_text(), flags=re.S)
    check(not BEHIND.search(html), "the overview as built links to nothing behind the sign-in")
    check("Miedema" not in html, "no value the oxide systems do not have")
    tools = re.sub(r"<script\b.*?</script>", "", (dist / "tools.html").read_text(), flags=re.S)
    check(not BEHIND.search(tools), "the tools page as built links to nothing behind the sign-in")

    server = ThreadingHTTPServer(("localhost", 0), functools.partial(Handler, directory=str(dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://localhost:{server.server_port}"
    answer = {"status": 401}

    def gate(route):
        if answer["status"] == 200:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps({"release": "madeup"}))
        return route.fulfill(status=answer["status"], content_type="application/json", body=json.dumps({"error": "refused"}))

    def visit(page, path):
        page.goto(origin + path)
        page.wait_for_load_state("networkidle")

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for status in (401, 403, 429, 500):
                answer["status"] = status
                ctx = browser.new_context(viewport={"width": 1280, "height": 900})
                ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
                ctx.route(origin + "/API/chaos/**", gate)
                page = ctx.new_page()
                visit(page, "/chaos.html")
                label = f"gate answers {status}: "
                check(page.get_attribute("html", "data-chaos-member") is None, label + "not a member")
                check(page.locator(".chaos-find, .access-card, .chaos-tools").count() == 0, label + "no search, no cards")
                hrefs = page.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")
                check(not [h for h in hrefs if BEHIND.search(h)], label + "no link behind the sign-in")
                check(page.locator(".chaos-hero h1").inner_text() == "CHAOS", label + "the band")
                check(page.locator("#chaos-cta a").all_inner_texts() == ["Sign in to CHAOS", "Get an account"], label + "the sign-in")
                check(page.locator(".chaos-offer dt").count() >= 4, label + "what an account gives")
                check(page.locator(".chaos-offer a").all_inner_texts() == ["Documentation, fields and examples"], label + "only the public documentation links")
                check(page.locator('.product-nav[data-product="chaos"] a').all_inner_texts() == ["Overview", "API"], label + "public tabs only")
                check(page.locator("a.ptable-cell, a.chaos-stat").count() == 0, label + "counts are plain")
                if status == 401:
                    for w in WIDTHS:
                        page.set_viewport_size({"width": w, "height": 800})
                        over = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                        check(over <= 0, f"signed out, {w} px: no sideways scroll ({over})")
                        rows = page.evaluate("new Set([...document.querySelectorAll('.chaos-hero .chaos-stat')].map(e => e.getBoundingClientRect().top)).size")
                        check(rows in (1, 2, 4), f"signed out, {w} px: the four counts in even rows ({rows})")
                    page.set_viewport_size({"width": 1280, "height": 900})
                    if args.screenshots:
                        page.screenshot(path=str(args.screenshots / "face_out.png"), full_page=True)
                ctx.close()

            answer["status"] = 200
            ctx = browser.new_context(viewport={"width": 1280, "height": 900})
            ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
            ctx.route(origin + "/API/chaos/**", gate)
            page = ctx.new_page()
            visit(page, "/chaos.html")
            page.wait_for_selector("html[data-chaos-member]")
            tabs = page.locator('.product-nav[data-product="chaos"] a').all_inner_texts()
            check(tabs[:3] == ["Overview", "Systems", "Materials"] and tabs[-2:] == ["API", "CHAOS-Agent"], "member tabs")
            check(page.locator(".chaos-tools .access-card").all_inner_texts()[0].startswith("Systems"), "the system pages come first")
            check(page.locator("#chaos-pitch").is_hidden(), "the account list is gone for members")
            check(page.locator("#chaos-cta").inner_text().startswith("Signed in"), "signed in shown")
            check(page.locator("#chaos-cta a").get_attribute("href") == "/API/signout", "sign out")
            check(page.locator("a.ptable-cell").count() > 20, "elements link to their systems")
            check("q=Mg+oxide" in page.locator("a.ptable-cell[title^='Mg'], a.ptable-cell:has-text('Mg')").first.get_attribute("href"), "Mg lists its systems")
            check(page.locator("a.chaos-stat").count() == 1, "the systems count links")
            check(page.locator(".ptable-count").first.inner_text() != "", "the counts survive the links")
            for w in WIDTHS:
                page.set_viewport_size({"width": w, "height": 800})
                over = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                check(over <= 0, f"signed in, {w} px: no sideways scroll ({over})")
            page.set_viewport_size({"width": 1280, "height": 900})
            if args.screenshots:
                page.screenshot(path=str(args.screenshots / "face_in.png"), full_page=True)
            page.fill("#chaos-find-q", "Mg Mn")
            page.click(".chaos-find button")
            page.wait_for_url("**/chaos-systems*")
            check("q=Mg+Mn" in page.url, "the search opens the systems")
            ctx.close()
            browser.close()
    finally:
        server.shutdown()
    print(f"{len(checks)} checks passed")


if __name__ == "__main__":
    main()
