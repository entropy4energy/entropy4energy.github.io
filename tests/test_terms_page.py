"""tests/test_terms_page.py: the CHAOS Terms of Use page and the links to it, in the built site
(make first). The page has its fifteen sections and the version line 2026-12, the line that it is in
force: "Version 2026-12. Effective <the go-live day>." (2026-11-22; no token, no B1 line left), the data-use standard with its eight
conditions and the request form at #request, and no interim or draft heading; robots.txt, the tdm-policy tag and the Dataset record link it; the CHAOS page
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
        self.assertRegex(self.html, r"<p>Version 2026-12\. Questions: <a href=\"mailto:s4e-chaos@jhu\.edu\">s4e-chaos@jhu\.edu</a>\.</p>")
        found = [int(n) for n in re.findall(r"<strong>(\d+)\. [^<]+</strong>", self.html)]
        self.assertEqual(found, list(range(1, 16)))
        self.assertNotIn("[", re.sub(r"<[^>]+>", "", self.html.split('<div class="prose">')[1]))
        self.assertNotIn("Draft", self.html)

    def test_in_force_from_the_go_live_day(self):
        self.assertRegex(self.html, r"<h1>CHAOS Terms of Use</h1>\s*<p class=\"terms-status\"><strong>Version 2026-12\. Effective "
                                    r"November 23, 2026\.</strong> Wording revised November 23, 2026, with no change in substance\.</p>")
        self.assertNotIn("@GOLIVE_DAY@", self.html)
        self.assertNotIn("to be announced", self.html)
        self.assertNotIn("Takes effect on a date to be announced; until then no new account is approved", self.html, "B1's line is gone")

    def test_data_use_standard_and_request_form(self):
        self.assertRegex(self.html, r'<h2 id="data-use-standard">CHAOS data-use standard</h2>')
        self.assertIn("whether the proposed output would reproduce or substitute for the CHAOS database", self.html)
        std = self.html.split('id="data-use-standard"')[1].split('id="request"')[0]
        self.assertEqual(len(re.findall(r"<li>", std)), 8)
        self.assertIn("Each approval states its last day, normally 12 months after approval", std)
        form = self.html.split('<h3 id="request">Request form</h3>')[1]
        self.assertRegex(form, r"^\s*<pre>CHAOS request: machine learning and AI use")
        self.assertIn("standard conditions of a CHAOS approval", form)

    def test_editorial_revision_of_2026_11_23(self):
        # Corey, 2026-11-23: plainer wording, no change in substance; the two points made explicit
        text = " ".join(re.sub(r"<[^>]+>", " ", self.html).split())
        self.assertIn("Each person who uses CHAOS data needs their own approved account, including the members of a research group named in an approval under section 4.", text)
        self.assertIn("Company-funded research, and research whose results a company has committed to receive or use, is commercial use under section 6(a).", text)
        for h in ("What data are covered.", "Training and model release.", "After an approval ends.", "How to request permission."):
            self.assertIn(h, text)
        for old in ("stand in for CHAOS", "Collaboration is welcome", "Renewal is one email", "These are three separate activities",
                    "systematically or not", "however identical copies are obtained", "Calculated values can be wrong",
                    "A record received again counts once", "made by the Entropy"):
            self.assertNotIn(old, text)
        # the substance kept: the limits, the evaluation allowance, the five prohibited uses, the breach clause
        for kept in ("up to 50 disordered systems and 1,000 ordered structures in any 12 months", "up to 20 CHAOS disordered systems or 200 CHAOS ordered structures",
                     "(e) give CHAOS data to another person or service", "JHU may seek an injunction", "general-purpose AI models",
                     "A refusal gives its reason and can be appealed once, within 30 days."):
            self.assertIn(kept, text)

    def test_names_no_other_database_or_license(self):
        text = re.sub(r"<[^>]+>", "", self.html)
        self.assertNotRegex(text, r"(?i)aflow|open database|odbl|dbcl")

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
