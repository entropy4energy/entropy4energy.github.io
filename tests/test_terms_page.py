"""tests/test_terms_page.py: the CHAOS Terms of Use page and the links to it, in the built site
(make first). The page has its fifteen sections and the version line, the line that it takes effect
on a date to be announced (2026-11-22, B1), and no interim or draft heading; robots.txt, the tdm-policy tag and the Dataset record link it; the CHAOS page
and the tools card say every account is approved by hand and name the terms, not a .edu address.

    python3 -m unittest tests/test_terms_page.py      from the repository root, after make
"""
import json
import re
import unittest
from pathlib import Path

DIST = Path(__file__).resolve().parent.parent / "dist"
URL = "https://chaos.s4e.ai/terms"


def page(name: str) -> str:
    return (DIST / f"{name}.html").read_text()


class TermsPage(unittest.TestCase):
    def setUp(self):
        self.html = page("terms")

    def test_sections_and_version(self):
        self.assertIn("<h1>CHAOS Terms of Use</h1>", self.html)
        self.assertRegex(self.html, r"<p>Version 2026-11\. Questions: <a href=\"mailto:s4e-chaos@jhu\.edu\">s4e-chaos@jhu\.edu</a>\.</p>")
        found = [int(n) for n in re.findall(r"<strong>(\d+)\. [^<]+</strong>", self.html)]
        self.assertEqual(found, list(range(1, 16)))
        self.assertNotIn("[", re.sub(r"<[^>]+>", "", self.html.split('<div class="prose">')[1]))
        self.assertNotIn("Draft", self.html)

    def test_effective_date_to_be_announced(self):
        self.assertRegex(self.html, r"<h1>CHAOS Terms of Use</h1>\s*<p class=\"terms-status\"><strong>Takes effect on a date to be "
                                    r"announced; until then no new account is approved\.</strong></p>")

    def test_in_force_not_interim(self):
        self.assertNotIn("Interim", self.html)
        self.assertNotIn("Not in force", self.html)
        self.assertNotIn("for each CHAOS entry", self.html, "the per-entry payment is dropped")

    def test_canonical_and_reservations(self):
        self.assertIn(f'<link rel="canonical" href="{URL}">', self.html)
        self.assertIn(f'<meta name="tdm-policy" content="{URL}">', self.html)
        self.assertIn('href="mailto:s4e-chaos@jhu.edu"', self.html)


class Links(unittest.TestCase):
    def test_robots_links_the_terms(self):
        robots = [p for p in DIST.rglob("robots*.txt")]
        self.assertTrue(robots, "no robots.txt built")
        self.assertTrue(any(f"Terms: {URL}" in p.read_text() for p in robots))

    def test_chaos_page(self):
        s = page("chaos")
        self.assertNotIn("<code>.edu</code>", s)
        self.assertIn("Every CHAOS account is approved by hand", s)
        self.assertIn(f'<a href="{URL}">CHAOS Terms of Use</a>', s)
        records = [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)]
        datasets = [r for r in records if r.get("@type") == "Dataset"]
        self.assertTrue(datasets, "no Dataset record")
        self.assertEqual(datasets[0]["license"], URL)
        self.assertIn("CHAOS Terms of Use", datasets[0]["conditionsOfAccess"])

    def test_tools_card(self):
        s = page("tools")
        self.assertNotIn(".edu email address", s)
        self.assertIn("approved by hand, under the CHAOS Terms of Use", s)


if __name__ == "__main__":
    unittest.main()
