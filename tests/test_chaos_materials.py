"""Browser checks of the CHAOS material pages (chaos-materials.js).

The page fetches everything from /API/chaos/profiles/materials/, which the
CHAOS API gate serves to signed-in accounts. Here a stand-in answers with
made-up files (tests/fixtures/chaos_materials_madeup.json, written by the
generator from made-up records, not CHAOS data) or with the gate's refusals.

    make && python tests/test_chaos_materials.py --dist dist
"""
import argparse
import functools
import json
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

from test_chaos_systems import BANNED, Handler

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "chaos_materials_madeup.json"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, required=True)
    parser.add_argument("--screenshots", type=Path, help="write screenshots here (outside the checkout)")
    args = parser.parse_args()
    files = json.loads(FIXTURE.read_text())["files"]
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
        path = route.request.url.split("/API/chaos/profiles/", 1)[1].split("?")[0]
        seen.append(path)
        mode = answer["mode"]
        if mode == "401":
            return route.fulfill(status=401, content_type="application/json", body=json.dumps({"error": "sign-in required"}))
        if mode == "403":
            return route.fulfill(status=403, content_type="application/json", body=json.dumps({"error": "no CHAOS access"}))
        if mode == "429":
            return route.fulfill(status=429, content_type="application/json",
                                 body=json.dumps({"error": "this account has opened 1,000 structure pages today"}))
        if path in files:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(files[path]))
        return route.fulfill(status=404, content_type="application/json", body=json.dumps({"error": "no such material"}))

    def visible_text(page):
        return page.locator("#cs-app").inner_text()

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            context = browser.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True)
            context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
            context.route(origin + "/API/chaos/profiles/**", gate)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))

            # ---- the shell and the search
            page.goto(origin + "/chaos-materials")
            page.locator("#cm-q").wait_for()
            check(page.locator('meta[name="robots"]').count() == 1
                  and page.locator('meta[name="robots"]').get_attribute("content") == "noindex, nofollow, noai, noimageai",
                  "one robots tag: not indexed, no AI use")
            check(page.locator('script[src*="googletagmanager"]').count() == 0, "no analytics on the material pages")
            check(page.locator("aside.sidebar").count() == 0, "no news sidebar")
            check(page.locator("body").get_attribute("data-s4e-product") == "chaos", "part of CHAOS")
            check(page.locator('.product-nav[data-product="chaos"] a.active').inner_text() == "Materials", "Materials lit in the CHAOS row")
            page.fill("#cm-q", "co o")
            page.click("#cm-form button")
            page.locator("#cm-results tbody tr").first.wait_for()
            got = page.locator("#cm-results tbody td:first-child").all_inner_texts()
            check(sorted(got) == ["Co3O4", "CoO", "MgCoO2"], f"element search lists the compositions with Co and O: {got}")
            check(seen[-1] == "materials/index/Co", "only the first element's index is fetched")
            check([t.strip() for t in page.locator("#cm-results th").all_text_contents()] == ["Composition", "Structures"],
                  "the element search shows names and counts, no enthalpies")
            check(all(len(r) == 3 for k, v in files.items() if k.startswith("materials/index/") for r in v["compositions"]),
                  "the element lists carry key, label and count only")
            check("q=co%20o" in page.url or "q=co+o" in page.url, "the search is kept in the address")
            page.fill("#cm-q", "OCo")
            page.click("#cm-form button")
            page.locator("#cm-structures").wait_for()
            check(page.url.endswith("chaos-materials?f=CoO"), "a formula opens its page, written the usual way")

            # ---- one composition
            check(page.locator("h1.cs-title").inner_text() == "CoO", "composition title")
            rows = page.locator("#cm-structures tbody tr")
            check(rows.count() == 3, "every structure of CoO")
            check(rows.first.locator("td").first.inner_text() == "rocksalt", "lowest structure first")
            check(rows.first.get_attribute("class") == "cm-lowest", "the lowest structure is marked")
            above = rows.locator("td:nth-child(6)").all_inner_texts()
            check(above[0] == "0" and above[1] == "+50", f"energy above the lowest structure: {above}")
            check(page.locator("#cm-structures th", has_text="Distance to the hull").count() == 1, "hull column when the hull is known")
            check("Phase stability of Co-O" in page.locator("#stability").inner_text(), "link to the hull app")
            stab = page.locator("#stability").inner_text()
            check("0.75 Co3O4" in stab and "+12 meV/atom" in stab, f"decomposition written from the numbers: {stab}")
            sys_text = page.locator("#systems").inner_text()
            check("end member of 3 disordered systems" in sys_text, "reverse links counted")
            check(page.locator('#systems a[href="chaos-systems?id=0000000000000010"]').count() == 1, "reverse links open the system pages")
            check(page.locator('#related a[href="chaos-materials?f=Co3O4"]').count() == 1, "same chemical system linked")
            check("*,species(Co,O),nspecies(2)" in page.locator("#cs-query").inner_text(), "the query for the chemical system")
            check("https://chaos.s4e.ai, release October 14, 2026" in page.locator("#data").inner_text(), "citation with the release")
            check(not BANNED.search(visible_text(page)), "no package or method names on the composition page")
            check(page.locator("u").count() >= 3, "PBE spelled out with underlined initials")

            # ---- one structure
            rows.first.locator("a").click()
            page.locator("#cm-viewer svg").wait_for()
            check(page.url.endswith("chaos-materials?id=00000000000000c6"), "structure address")
            check(seen[-1] == "materials/s/00/00000000000000c6", "the structure file is fetched from its folder")
            check(page.locator("#cm-viewer circle").count() > 8, "the cell is drawn with the images on its faces")
            before = page.locator("#cm-viewer svg").inner_html()
            page.focus("#cm-viewer .cm-view-svg")
            page.keyboard.press("ArrowRight")
            check(page.locator("#cm-viewer svg").inner_html() != before, "the arrow keys turn the cell")
            check(page.locator("#cm-sites tbody tr").count() == 8, "one row per site")
            check("Co1" in page.locator("#cm-sites").inner_text() and "+1.20 e" in page.locator("#structure").inner_text(),
                  "site labels and the mean Bader charge")
            check(page.locator("#cm-pattern line.cm-stick").count() == len(files["materials/s/00/00000000000000c6"]["pattern"]),
                  "one stick per reflection")
            page.locator("#cm-width").fill("0.3")
            check(page.locator("#cm-pattern polyline.cm-curve").count() == 1, "broadened pattern from the width slider")
            check(page.locator("#cm-peaks tbody tr").first.locator("td").nth(3).inner_text() == "200", "strongest reflection first in the table")
            check(page.locator('#pattern a[href="https://s4e.ai/xrd/"]').count() == 1, "link to XRD Phase ID")
            with page.expect_download() as dl:
                page.click("#cm-csv")
            csv = Path(dl.value.path()).read_text().splitlines()
            check(csv[0] == "two_theta_deg,d_angstrom,relative_intensity,hkl" and len(csv) == len(files["materials/s/00/00000000000000c6"]["pattern"]) + 1,
                  "the pattern as CSV")
            with page.expect_download() as dl:
                page.click("#cm-cif")
            cif = Path(dl.value.path()).read_text()
            check("_cell_length_a   4.26" in cif and cif.count(" 1\n") >= 8, "the structure as CIF")
            check("This is the lowest structure of CoO" in page.locator("#stability").inner_text(), "lowest structure stated")
            check(page.locator('#others a[href="chaos-materials?id=00000000000000c7"]').count() == 1, "other structures linked")
            check("*,chaos_id(s4e:00000000000000c6)" in page.locator("#cs-query").inner_text(), "the query for this entry")
            check("PBE" in page.locator("#data").inner_text() and "PAW" not in page.locator("#data").inner_text(), "functional named plainly")
            check(not BANNED.search(visible_text(page)), "no package or method names on the structure page")
            check("POSCAR" not in visible_text(page), "no program-specific file format offered")
            page.goto(origin + "/chaos-materials?id=00000000000000c8")
            page.locator("#structure").wait_for()
            check(page.locator("#pattern").count() == 1, "a structure with a pattern shows it")
            check("lies +220 meV/atom above" in page.locator("#stability").inner_text(), "energy above the lowest written out")
            check("metal" in page.locator("#electronic").inner_text(), "gap type shown")
            page.goto(origin + "/chaos-materials?f=MgCoO2")
            page.locator("#cm-structures").wait_for()
            check("two-cation compound of 2 disordered systems" in page.locator("#systems").inner_text(), "two-cation reverse links")
            check(page.locator("#stability").count() == 1 and page.locator("#related").count() == 1, "sections present")

            # ---- a structure without a cell or an enthalpy, and two-capital formulas
            page.goto(origin + "/chaos-materials?id=00000000000004d4")
            page.locator("#structure").wait_for()
            check(page.locator("#cm-viewer").count() == 0 and page.locator("#cm-cif").count() == 0, "no viewer or CIF without a cell")
            check(page.locator('a[href="chaos-materials?id=null"]').count() == 0, "no link to a missing lowest structure")
            check("–" not in page.locator(".cs-bar").inner_text(), "the summary bar lists only values that exist")
            page.goto(origin + "/chaos-materials?f=MgO")
            page.locator("#cm-structures").wait_for()
            check("more at this composition" not in visible_text(page), "no count of other structures when there are none")
            page.goto(origin + "/chaos-materials")
            page.fill("#cm-q", "OCO")
            page.click("#cm-form button")
            page.locator(".cs-status, #cm-structures").first.wait_for()
            check("f=OCO" in page.url, "a word with two capitals is read as a formula")

            # ---- refusals and bad addresses
            n = len(seen)
            page.goto(origin + "/chaos-materials?id=../../x")
            page.locator(".cs-status").wait_for()
            check("no material" in page.locator(".cs-status").inner_text().lower() and len(seen) == n, "a malformed address is not fetched")
            page.goto(origin + "/chaos-materials?f=Xx2Q")
            page.locator(".cs-status").wait_for()
            check("no material" in page.locator(".cs-status").inner_text().lower(), "an unknown formula")
            answer["mode"] = "401"
            page.goto(origin + "/chaos-materials?f=CoO")
            page.locator(".cs-status.signin").wait_for()
            href = page.locator(".cs-status a.primary").get_attribute("href")
            check(href.startswith("https://chaos.s4e.ai/API/signin?next=") and "CoO" in href, "sign-in, back to this page")
            answer["mode"] = "403"
            page.reload()
            page.locator(".cs-status.signin").wait_for()
            check("not approved" in page.locator(".cs-status").inner_text(), "no CHAOS access")
            answer["mode"] = "429"
            page.reload()
            page.locator(".cs-status.error").wait_for()
            check("1,000 structure pages" in page.locator(".cs-status").inner_text(), "the limit is explained")
            answer["mode"] = "ok"

            # ---- phone width
            phone = browser.new_context(viewport={"width": 390, "height": 844})
            phone.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
            phone.route(origin + "/API/chaos/profiles/**", gate)
            pp = phone.new_page()
            pp.on("pageerror", lambda e: errors.append(str(e)))
            for url, sel in (("/chaos-materials", "#cm-q"), ("/chaos-materials?f=CoO", "#cm-structures"),
                             ("/chaos-materials?id=00000000000000c6", "#cm-viewer svg"),
                             ("/chaos-materials?id=00000000000001c3", "#cm-viewer svg")):
                pp.goto(origin + url)
                pp.locator(sel).wait_for()
                wide = pp.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(wide <= 0, f"no sideways scrolling at 390 px: {url} ({wide} px)")
                small = pp.evaluate("""() => [...document.querySelectorAll('#cs-app button, #cs-app input')]
                    .filter(e => e.offsetParent && e.getBoundingClientRect().height < 30).length""")
                check(small == 0, f"controls large enough to tap at 390 px: {url}")
                if "id=" in url:
                    px = pp.evaluate("""() => { const t = document.querySelector('#cm-pattern text'), svg = t.ownerSVGElement;
                        return parseFloat(getComputedStyle(t).fontSize) * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width; }""")
                    check(px >= 11.5, f"pattern labels at least 12 px on a phone: {url} ({px:.1f} px)")
            if args.screenshots:
                args.screenshots.mkdir(parents=True, exist_ok=True)
                pp.screenshot(path=str(args.screenshots / "material_phone.png"), full_page=True)
                page.goto(origin + "/chaos-materials?id=00000000000000c6")
                page.locator("#cm-viewer svg").wait_for()
                page.screenshot(path=str(args.screenshots / "material_desktop.png"), full_page=True)
                page.goto(origin + "/chaos-materials?f=CoO")
                page.locator("#cm-structures").wait_for()
                page.screenshot(path=str(args.screenshots / "composition_desktop.png"), full_page=True)
            check(not errors, f"no script errors: {errors}")
            browser.close()
    finally:
        server.shutdown()
    print(f"{len(checks)} checks passed")
    for c in checks:
        print("  ok  " + c)


if __name__ == "__main__":
    main()
