# Fusion Mirror: methods and integration notes

## Scope

An interactive viewer for **DFT results only**: refractive index n, extinction coefficient k, and normal-incidence Air/material reflectivity. It is not an experimental database or a coating/thickness/angle solver. The original archived DFT data and preprocessing conventions are retained.

The interface prioritizes questions an experimentalist may ask: Is my wavelength covered? What n, k and R are available there? Are the numbers valid? Does the response depend on the PAW choice, tensor component or response channel? Can I download exactly what I plotted?

The wavelength lookup includes 532 and 1064 nm shortcuts and accepts arbitrary positive wavelengths. LIGO's main laser operates at 1064 nm ([LIGO](https://www.ligo.caltech.edu/LA/page/laser)); this is motivation for a convenient query, **not** a claim that the calculated bare materials are suitable LIGO mirrors. ITER's [diagnostics overview](https://www.iter.org/machine/supporting-systems/diagnostics) motivates spectral access for diagnostic optics, not a durability prediction. Coating loss, thermal noise, roughness, damage thresholds, radiation and plasma exposure remain outside this dataset.

## Numerical conventions

| Choice | Meaning |
| --- | --- |
| Standard / GW-oriented PAW | Two potential datasets, both using PBE electronic structure; not PBE versus quasiparticle GW |
| Density / current | Separate dielectric-response channels; density is the manuscript default |
| Normal-z mode 1 / 2 | Indices derived from the full dielectric tensor, sorted at each wavelength |
| Cartesian x / y / z | Square-root diagonal diagnostics; not a replacement for anisotropic reflection |
| Reflectivity | Full-tensor reflected powers; Cartesian z surface normal; Air / semi-infinite bulk; 0°; no coating |
| UV / visible / near-IR | 200–400 / 400–700 / 700–1,200 nm, with inclusive endpoints |
| Screening / native | Preprocessed 1 nm study grid / original positive-energy sampling expressed in wavelength |

Values and flags are read as stored. n/k require `finite_epsilon` and `passive_epsilon`; R requires `valid_normal_z` and a finite reflected power. Unavailable values are blank, never zero. Invalid rows interrupt curves. No new interpolation, extrapolation or averaging is performed; straight lines join neighbouring valid samples. A native min/max span does not prove uninterrupted support. The wavelength probe reports the **actual nearest sample and its offset**, refuses out-of-window queries and preserves invalid-value gaps.

Plotted CSVs include all sampled rows in the selected window, with quality flags and blank unavailable outputs. Source `.csv.gz` downloads are the original selected File objects, retaining full tensor columns and unplotted rows. SVG and metadata JSON exports record the selection and source references. PNG exports are rasterized SVGs.

## Local export contract (schema version 1)

Select a folder with exactly one `catalog.json`:

```text
data/
  catalog.json
  spectra/<family>/<material>/<branch>/<sampling>_<channel>.json
  source_csv/.../*.csv.gz
```

The catalogue supplies `schema_version: 1`, `families`, and a nonempty `materials` array. Each material has `id`, `family`, `excluded` and `runs`. Each PBE/GW run provides `metadata` and `channels.density/current.native/screening`, with `url`, `range_nm` and `sources`. Paths start with `data/` and resolve only within the selected folder. All indexed spectrum files must exist. Source entries provide `kind`, `download` and the archived provenance/hash fields; missing source downloads produce a visible error rather than requesting a network URL.

Spectrum JSON has `columns` and `rows` arrays. Required columns are `wavelength_nm`, `energy_eV`, n/k for `mode1`, `mode2`, `x`, `y`, `z`, `R_unpolarized_percent`, `R_x_percent`, `R_y_percent`, `finite_epsilon`, `passive_epsilon`, `rounding_uncertain_absorption`, and `valid_normal_z`. Wavelength rows must be positive, finite and strictly increasing. JSON inputs are limited to 50 MB per file and spectra to 10,000 rows to avoid accidentally opening unrelated heavy outputs. The current exported format fits these limits.

The UI performs structural checks and applies archived validity flags; it does not independently validate convergence or physical accuracy. Check the supplied release's validation and provenance before interpretation.

## Integration boundary

Only the new tool has new CSS rules. Existing shared styles, header/footer templates and CHAOS/LOOP code are untouched. The shared base template changes only the tool description, metadata for the new page, and analytics exclusion for that page. Tools navigation is generated from `tools.json`. The Makefile includes the new HTML/CSS/JS; the JS is copied intact to preserve external JSON field names that Closure ADVANCED might rename.

No figure assets or datasets are needed to build the site. The default unloaded preview is intentionally honest: it does not display synthetic science as if it were real DFT. Test fixtures are explicitly synthetic, created at test time and not offered as data.

## Release boundary

This code-only preview is not an access-control system for future publicly hosted datasets. Once approved for release, a separately reviewed change must establish the public data endpoint, immutable release/version/checksums, licence, manuscript citation and download policy. Do not simply place unpublished files in `src/media`, `dist` or a Git branch. A private local preview does not require copying any files into this repository.

This work was supported by the **Seaver Institute**.
