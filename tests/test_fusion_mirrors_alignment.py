"""Scientific scope and summary values from the study revision of 2026-10-24."""
from pathlib import Path
import re
import unittest
from check_site_style import Text

class StudyAlignmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=Path(__file__).resolve().parents[1]
        cls.html=(root/'src/templates/fusion-mirrors.html').read_text()
        cls.text=' '.join(Text(cls.html).text.split())

    def test_bare_interface_geometry_and_default_channel(self):
        self.assertIn('Normal incidence · Uncoated material · Calculated data',self.text)
        self.assertIn('homogeneous and semi-infinite',self.text)
        self.assertIn('including polarization conversion',self.text)
        self.assertRegex(self.text,r'mode-specific n\s*,\s*k pair and the full-tensor R')
        self.assertIn('standard PAW dataset and density response match',self.text)
        self.assertIn('Both options use independent-particle PBE calculations',self.text)

    def test_coating_changes_match_the_study(self):
        rows=re.findall(r'<tr><th scope="row">(Rh|Mo|W)</th><td>([^<]+)</td><td>([^<]+)</td></tr>',self.html)
        actual={m:tuple(float(v.replace('−','-')) for v in [a,b]) for m,a,b in rows}
        self.assertEqual(actual,{'Rh':(-.98,-10.21),'Mo':(-1.02,-14.66),'W':(-1.17,-14.22)})
        self.assertIn('in percentage points',self.text)
        self.assertIn('Negative values indicate lower reflectivity',self.text)
        self.assertIn('equal-weight mean',self.text)

    def test_populations_and_wavelength_order_are_distinct(self):
        self.assertIn('115 compositions (227 optical responses)',self.text)
        self.assertIn('152 matched coated devices at 100 nm',self.text)
        self.assertIn('10.64 percentage points',self.text)
        self.assertIn('At 532 nm and 100 nm thickness',self.text)
        self.assertIn('reversing their three-band order',self.text)

    def test_data_access_matches_the_paper(self):
        self.assertIn('mailto:corey.oses@jhu.edu',self.html)
        self.assertIn('upon reasonable request',self.text)
        self.assertNotRegex(self.html,r'href="[^"]*\.(csv|npz|zip)([?"#])')

    def test_off_grid_sampling_method_is_explicit(self):
        self.assertIn('nearest stored 1 nm sample',self.text)
        self.assertIn('reports the nearest stored wavelength and offset',self.text)
        self.assertIn('diagnostic-line calculations interpolate complex dielectric components',self.text)
        self.assertNotIn('Exact-value queries',self.html)

if __name__=='__main__':unittest.main()
