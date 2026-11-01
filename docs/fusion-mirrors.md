# Fusion Mirrors methods and access

Fusion Mirrors presents DFT optical constants and normal-incidence
Air/material reflectivity. The data service reads a separately verified
private package. The website repository contains application code and
synthetic test fixtures.

## Optical quantities

Both the standard and GW-oriented PAW datasets use PBE electronic
structure. Density and current responses remain separate. The n/k plots
show normal-z mode 1. The reflectivity plot shows the full-tensor
unpolarized response at an air interface, with Cartesian z as the surface
normal and a semi-infinite material substrate.

The service reads the stored screening grid. It retains invalid-value gaps
and performs no interpolation, extrapolation, or band averaging. The
wavelength query returns the nearest stored sample within the selected
band and reports its wavelength and offset. Values are rounded to four
significant digits. Method references and selected calculation settings
accompany each view.

## Data presentation

The server generates PNG plots. Individual numerical queries return one
wavelength for up to three materials on one PAW branch, or one material on up to two PAW branches. Complete spectra,
source CSVs, tensor files, and archives remain outside the public web
root. The frontend receives no complete spectrum arrays.

The service limits plots and numerical queries with shared persistent
quotas. Plots can be digitized, and repeated queries can recover portions
of the data. These controls restrict convenient bulk extraction.

The interactive service covers calculated bare interfaces. The separate
study section reports selected coating results. It uses the same standard-PAW
PBE density inputs, unit-index incident medium, Cartesian z surface normal,
unpolarized powers and semi-infinite substrates as the paper. Coating changes
are coated minus matching bare R3 in percentage points; R3 gives equal weight
to the UV, visible and near-infrared means. The page distinguishes the fixed
100 nm, 152-pair comparison from the thickness sweep and the 532 nm result.

The n/k view is mode 1; full-tensor R averages both incident polarizations,
including conversion. A scalar Fresnel calculation from that one n/k pair
need not reproduce full-tensor R for an anisotropic material. Off-grid web
queries return the nearest stored sample and offset. The paper instead
interpolates dielectric components for its diagnostic-line calculations.
Both PAW types are independent-particle PBE calculations.

The website makes no claim that the optical identity screen establishes
fusion durability. Cs belongs to the paper's literature reference population,
not its fixed device registry or this calculated-spectrum catalog. The paper's
negative-k exclusion is a separate frozen-mask sensitivity test; it does not
replace the primary discovery counts or alter these DFT spectra.

## Implementation

- `src/templates/fusion-mirrors.html` uses the shared site shell.
- `src/css/fusion-mirrors.scss` scopes styles to the explorer container.
- `src/js/fusion-mirrors.js` requests images, settings, and individual values.
- `services/fusion-mirrors/` contains the private-data service and its tests.
- `tests/test_fusion_mirrors.py` checks the integrated page with synthetic data.

[Service configuration](../services/fusion-mirrors/README.md) describes the
API, quotas, private storage, and reverse-proxy requirements. The tools
entry is present in the shared navigation and tools overview.

This work was supported by the Seaver Institute.
