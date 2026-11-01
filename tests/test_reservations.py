"""tests/test_reservations.py: the reservations of AI use on the tools host
(CHAOS's terms on model training, 2026-10-24). robots.txt keeps the AI
crawlers off every page of s4e.ai (whose files chaos.s4e.ai serves too),
tells every other crawler the same in Content-Signal and Content-Usage, and
keeps search engines on the pages and the API's help; the lab host's file is
unchanged. Every page carries the TDMRep tag and one robots tag with noai,
noimageai; tdm-policy and the robots.txt comment link the terms only once
TERMS_URL is set.

    python3 -m unittest tests/test_reservations.py      from the repository root
"""
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
import build  # noqa: E402


class Robots(unittest.TestCase):
    def setUp(self):
        self.text = build.build_robots(build.TOOLS_HOST)

    def groups(self):
        return [g.strip().splitlines() for g in self.text.split("\n\n")]

    def test_ai_crawlers_kept_off_every_page(self):
        first = [l for l in self.groups()[0] if not l.startswith("#")]
        self.assertEqual(first[:-1], [f"User-agent: {n}" for n in build.AI_CRAWLERS])
        self.assertEqual(first[-1], "Disallow: /")
        for name in ("GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "Applebot-Extended", "PerplexityBot",
                     "meta-externalagent", "Bytespider", "ChatGPT-User", "Perplexity-User"):
            self.assertIn(f"User-agent: {name}\n", self.text)

    def test_everyone_else(self):
        star = self.groups()[1]
        self.assertEqual(star, ["User-agent: *", "Content-Signal: search=yes, ai-input=no, ai-train=no",
                                "Content-Usage: train-ai=n", "Allow: /API/?help", "Allow: /API/?schema",
                                "Disallow: /API/", "Disallow: /account", "Allow: /"])
        self.assertTrue(self.text.endswith("\nSitemap: https://s4e.ai/sitemap.xml\n"))
        self.assertNotIn("User-agent: Googlebot", self.text, "search engines are not named, so they keep access")

    def test_terms_link_only_when_published(self):
        self.assertNotIn("Terms:", self.text)
        build.TERMS_URL = "https://chaos.s4e.ai/terms"
        try:
            self.assertIn("Johns Hopkins University. Terms: https://chaos.s4e.ai/terms\n", build.build_robots(build.TOOLS_HOST))
        finally:
            build.TERMS_URL = ""

    def test_lab_host_unchanged(self):
        self.assertEqual(build.build_robots(build.LAB_HOST),
                         "User-agent: *\nAllow: /\n\n# A full copy of every page, rebuilt from the dev branch.\n"
                         "Disallow: /__dev__/\n\nSitemap: https://entropy4energy.ai/sitemap.xml\n")


class Pages(unittest.TestCase):
    def metas(self, html, name):
        return re.findall(rf'<meta name="{name}" content="([^"]*)">', html)

    def test_one_robots_tag_on_every_page(self):
        for section, want in [("tools", "noai, noimageai"), ("research", "noai, noimageai"),
                              ("chaos-systems", "noindex, nofollow, noai, noimageai")]:
            with self.subTest(section=section):
                html = build.build_html(section)
                self.assertEqual(self.metas(html, "robots"), [want])
                self.assertEqual(self.metas(html, "tdm-reservation"), ["1"])
                self.assertEqual(self.metas(html, "tdm-policy"), [], "no link before the terms are published")

    def test_tdm_policy_once_published(self):
        build.TERMS_URL = "https://chaos.s4e.ai/terms"
        try:
            self.assertEqual(self.metas(build.build_html("tools"), "tdm-policy"), ["https://chaos.s4e.ai/terms"])
        finally:
            build.TERMS_URL = ""


if __name__ == "__main__":
    unittest.main()
