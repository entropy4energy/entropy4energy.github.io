# Site format and scientific typography

The shared stylesheet and shell define the site format. New tools use the existing header, navigation, Work Sans body font, Hopkins Slab page title, heading rules and color tokens. Component styles preserve these shared rules.

Underline the defining letters of first-use acronyms with `<u>`, for example `<u>d</u>ensity <u>f</u>unctional <u>t</u>heory (DFT)`. DFT always gets a definition. Apply the same convention to projector-augmented-wave (PAW) and Perdew-Burke-Ernzerhof (PBE) before their first use in explanatory prose. Controls retain short labels. UV and IR are established spectral labels, and GW, VASP and LOPTICS remain method or software names.

Use `<var>` for scientific variables and leave numbers and units upright. Chemical formulas take subscripts. In select options, use Unicode subscripts because option text cannot contain HTML. Format scientific notation with a multiplication sign and superscript exponent, preserving the stored number and the identifier used in queries.

State what the calculation or tool does, with section titles that name the subject. Preserve established wording unless a change improves accuracy or comprehension. Keep introductions short. Claims about material suitability need evidence from the calculations or cited work.

The Fusion Mirrors view uses the actual calculated spectrum. Its UV, visible and near-infrared regions retain their shaded backgrounds. Numerical queries remain bounded to a single wavelength, with unsupported values shown as unavailable.

After building, run `python tests/check_site_style.py --dist dist` and the site-style unit tests. The browser tests check the shared fonts and heading rule, italic variables, chemical subscripts and exponent markup. Service tests check the spectral-region colors. Review desktop and phone views against the reference images before publication.
