import unittest
from check_site_style import typography_errors

class ScientificTypographyTests(unittest.TestCase):
    def test_underlined_definition(self):
        html='<p><u>d</u>ensity <u>f</u>unctional <u>t</u>heory (DFT)</p>'
        self.assertEqual(typography_errors(html,True),[])
    def test_removing_underlines_fails(self):
        self.assertIn('DFT: defining letters must be underlined',typography_errors('<p>density functional theory (DFT)</p>',True))
    def test_wrong_letters_fail(self):
        self.assertIn('DFT: defining letters must be underlined',typography_errors('<p>d<u>e</u>nsity <u>f</u>unctional <u>t</u>heory (DFT)</p>',True))
    def test_missing_definition_fails(self):
        self.assertIn('PAW: missing first-use definition',typography_errors('<p>PAW datasets</p>',True))
    def test_definition_after_first_use_fails(self):
        html='<p>PBE datasets use <u>P</u>erdew–<u>B</u>urke–<u>E</u>rnzerhof (PBE).</p>'
        self.assertIn('PBE: used before its definition',typography_errors(html,True))
    def test_software_names_and_controls_are_not_prose_definitions(self):
        self.assertEqual(typography_errors('<p>VASP LOPTICS GW</p><select><option>PAW / PBE</option></select>',True),[])

if __name__=='__main__':unittest.main()
