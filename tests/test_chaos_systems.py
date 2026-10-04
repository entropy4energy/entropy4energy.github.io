"""Browser checks of the CHAOS system pages (chaos-systems.js).

The page fetches everything from /API/chaos/profiles/, which the CHAOS API
gate serves to signed-in accounts. Here a stand-in answers with made-up
profiles (tests/fixtures/chaos_systems_madeup.json, not CHAOS data) or with
the gate's refusals.

    make && python tests/test_chaos_systems.py --dist dist
"""
import argparse
import functools
import json
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "chaos_systems_madeup.json"
# Words the public CHAOS text does not use (package and method names), as in
# the CHAOS API documentation check. Field names and AUIDs are left out first.
BANNED = re.compile(r"(?i)\bpocc\b|\bvasp\b|\bcce\b|entropy[- ]forming|\befa\b|misfit|\baflux\b|\baflow\b")


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Extensionless pages, as on the production server.
        target, _, query = self.path.partition("?")
        if not Path(target).suffix and Path(self.directory, target.lstrip("/") + ".html").is_file():
            self.path = target + ".html" + ("?" + query if query else "")
        super().do_GET()

    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, required=True)
    parser.add_argument("--screenshots", type=Path, help="write screenshots here (outside the checkout)")
    args = parser.parse_args()
    fixture = json.loads(FIXTURE.read_text())
    by_label = {s["label"]: s["id"] for s in fixture["index"]["systems"]}
    rocksalt = by_label["(Co,Cu,Fe,Mg,Mn)O"]
    checks = []

    def check(ok, label):
        if not ok:
            raise AssertionError(label)
        checks.append(label)

    server = ThreadingHTTPServer(("localhost", 0), functools.partial(Handler, directory=str(args.dist.resolve())))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://localhost:{server.server_port}"
    answer = {"mode": "ok"}
    seen = []

    def gate(route):
        req = route.request
        path = req.url.split("/API/chaos/profiles/", 1)[1].split("?")[0]
        seen.append(path)
        mode = answer["mode"]
        if mode == "401":
            return route.fulfill(status=401, content_type="application/json",
                                 body=json.dumps({"error": "sign-in required"}))
        if mode == "profile":
            return route.fulfill(status=403, content_type="application/json",
                                 body=json.dumps({"error": "complete your profile first",
                                                  "profile": "https://s4e.ai/loop/accounts/profile/"}))
        if mode == "429":
            return route.fulfill(status=429, content_type="application/json",
                                 body=json.dumps({"error": "this account has opened 500 system pages today"}))
        if path in ("", "index.json"):
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(fixture["index"]))
        pid = path.removesuffix(".json")
        if pid in fixture["profiles"]:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(fixture["profiles"][pid]))
        return route.fulfill(status=404, content_type="application/json", body=json.dumps({"error": "no such system"}))

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
            context.route(origin + "/API/chaos/profiles/**", gate)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))

            # ---- the shell
            page.goto(origin + "/chaos-systems")
            page.locator("#cs-table tbody tr").first.wait_for()
            check(page.locator('meta[name="robots"][content*="noindex"]').count() == 1, "not indexed")
            check(page.locator('script[src*="googletagmanager"]').count() == 0, "no analytics on the system pages")
            check(page.locator("aside.sidebar").count() == 0, "no news sidebar")
            check(page.locator("body").get_attribute("data-s4e-product") == "chaos", "part of CHAOS")
            check(page.locator("#subnav_chaos.active").count() == 1, "CHAOS lit in the sub-navigation")

            # ---- the list
            rows = page.locator("#cs-table tbody tr")
            check(rows.count() == 30, "the largest cohort is shown first")
            first = rows.first.locator("td").nth(3).inner_text()
            check(first == "100th", "highest formability first")
            check(page.locator("#cs-map circle").count() == 30, "every system of the cohort on the map")
            page.fill("#cs-q", "mg mn")
            check(all("Mg" in t and "Mn" in t for t in rows.locator("td:first-child").all_inner_texts()), "element search")
            check("q=mg+mn" in page.url or "q=mg%20mn" in page.url, "the search is kept in the address")
            check(page.locator("#cs-map circle.hit").count() == rows.count(), "matches are marked on the map")
            page.fill("#cs-q", "")
            page.select_option("#cs-cohort", "")
            check(rows.count() == len(fixture["index"]["systems"]), "all systems")
            page.select_option("#cs-v", "formability")
            check(all(t == "HIGH FORMABILITY" for t in rows.locator(".cs-chip").all_inner_texts()), "verdict filter")
            if args.screenshots:
                args.screenshots.mkdir(parents=True, exist_ok=True)
                page.select_option("#cs-v", "")
                page.select_option("#cs-cohort", fixture["index"]["cohorts"][0]["key"])
                page.screenshot(path=str(args.screenshots / "list.png"), full_page=True)

            # ---- one system
            page.goto(origin + "/chaos-systems?id=" + rocksalt)
            page.locator(".cs-identity").wait_for()
            p = fixture["profiles"][rocksalt]
            check(page.locator(".cs-title").inner_text() == "(Co,Cu,Fe,Mg,Mn)O", "title")
            check("(Co,Cu,Fe,Mg,Mn)O" in page.title(), "browser title")
            check(page.locator(".cs-bar .cs-chip").inner_text().lower() == "lower priority", "verdict in the bar")
            check(page.locator("details.cs-sec[open]").count() == 3, "three sections open, the rest collapsed")
            check("Cu" in page.locator(".cs-warn").first.inner_text() and "tenorite" in page.locator(".cs-warn").first.inner_text(),
                  "the element whose end member takes another structure is named")
            mass = page.locator(".cs-mass").first
            m5 = float(mass.inner_text().split()[0])
            page.fill("#cs-batch", "10")
            m10 = float(mass.inner_text().split()[0])
            check(abs(m10 - 2 * m5) < 0.002 * m10, "masses follow the batch size")
            want = 5 * p["weigh_out"]["rows"][0]["mol"] * p["weigh_out"]["rows"][0]["molar_mass"] / p["weigh_out"]["product"]["mass"]
            check(abs(m5 - want) < 0.001 * want, "mass of the first precursor for 5 g")
            page.click('a[data-open="neighbors"]')
            check(page.locator("details#neighbors").get_attribute("open") is not None, "a jump link opens its section")
            cells = page.locator(".cs-matrix td a")
            check(cells.count() == len(p["neighbors"]["list"]), "one cell per neighbor")
            check(page.locator("#cs-query").text_content() == p["query"], "the query")
            check(page.locator('a[href="https://s4e.ai/chaos/agent/"]').count() >= 1, "CHAOS-Agent link")
            text = page.locator("#cs-app").inner_text()
            prose = re.sub(r"\b\w+_\w+\b|aflow:[0-9a-f]+", " ", text)
            bad = sorted(set(m.group(0) for m in BANNED.finditer(prose)))
            check(not bad, f"no package or method names in the text: {bad}")
            check("—" not in text, "no em dashes")
            page.evaluate("document.querySelectorAll('details').forEach(function (d) { d.open = true })")
            text = page.locator("#cs-app").inner_text()
            prose = re.sub(r"\b\w+_\w+\b|aflow:[0-9a-f]+", " ", text)
            bad = sorted(set(m.group(0) for m in BANNED.finditer(prose)))
            check(not bad, f"no package or method names in the open sections: {bad}")
            if args.screenshots:
                page.screenshot(path=str(args.screenshots / "system.png"), full_page=True)
            cells.first.click()
            page.wait_for_url(re.compile(r"chaos-systems\?id="))
            page.locator(".cs-identity, .cs-status").first.wait_for()
            check("id=" + rocksalt not in page.url, "a neighbor cell opens the neighbor")

            # other structures: no simple precursors for the perovskite, elements for the alloy
            page.goto(origin + "/chaos-systems?id=" + by_label["Sr(Hf,Mn,Sn,Ti,Zr)O3"])
            page.locator(".cs-identity").wait_for()
            check(page.locator("details.cs-sub-details[open]").count() == 1, "perovskite: element amounts shown open")
            page.goto(origin + "/chaos-systems?id=" + by_label["(Co,Cr,Fe,Mn,Ni)"])
            page.locator(".cs-identity").wait_for()
            check(page.locator("#make table th").first.text_content() == "Element", "alloy: weigh out the elements")
            check("oxygen" not in page.locator(".cs-caveat").inner_text().lower(), "alloy: no oxygen in the caveat")

            # ---- refusals and errors
            page.goto(origin + "/chaos-systems?id=0000000000000bad")
            page.locator(".cs-status").wait_for()
            check("no system" in page.locator(".cs-status").inner_text().lower(), "unknown system")
            page.goto(origin + "/chaos-systems?id=../../x")
            page.locator(".cs-status").wait_for()
            check("no system" in page.locator(".cs-status").inner_text().lower(), "a malformed address is not fetched")
            answer["mode"] = "401"
            page.goto(origin + "/chaos-systems?id=" + rocksalt)
            page.locator(".cs-status.signin").wait_for()
            href = page.locator(".cs-status a.primary").get_attribute("href")
            check(href.startswith("/loop/accounts/login/?next=") and rocksalt in href, "sign-in, back to this page")
            answer["mode"] = "profile"
            page.reload()
            page.locator(".cs-status.signin").wait_for()
            check(page.locator(".cs-status a.primary").get_attribute("href").startswith("/loop/accounts/profile/?next="),
                  "profile first")
            answer["mode"] = "429"
            page.reload()
            page.locator(".cs-status.error").wait_for()
            check("500 system pages" in page.locator(".cs-status").inner_text(), "the limit is explained")
            answer["mode"] = "ok"

            # ---- phone width: no sideways scrolling of the page
            phone = browser.new_context(viewport={"width": 390, "height": 844})
            phone.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
            phone.route(origin + "/API/chaos/profiles/**", gate)
            pp = phone.new_page()
            pp.on("pageerror", lambda e: errors.append(str(e)))
            for url in ("/chaos-systems", "/chaos-systems?id=" + rocksalt):
                pp.goto(origin + url)
                pp.locator("#cs-table, .cs-identity").first.wait_for()
                pp.evaluate("document.querySelectorAll('details').forEach(function (d) { d.open = true })")
                wide = pp.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(wide <= 0, f"no sideways scrolling at 390 px: {url} ({wide} px)")
            if args.screenshots:
                pp.screenshot(path=str(args.screenshots / "system_phone.png"), full_page=True)
            check(not errors, f"no script errors: {errors}")
            browser.close()
    finally:
        server.shutdown()
    print(f"{len(checks)} checks passed")
    for c in checks:
        print("  ok  " + c)


if __name__ == "__main__":
    main()
