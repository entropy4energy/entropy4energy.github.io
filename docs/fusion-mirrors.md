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
wavelength for one material and up to two PAW branches. Complete spectra,
source CSVs, tensor files, and archives remain outside the public web
root. The frontend receives no complete spectrum arrays.

The service limits plots and numerical queries with shared persistent
quotas. Plots can be digitized, and repeated queries can recover portions
of the data. These controls restrict convenient bulk extraction.

The current service covers DFT bare-interface spectra. Literature overlays
and coating comparisons require their corresponding verified inputs.

## Implementation

- `src/templates/fusion-mirrors.html` uses the shared site shell.
- `src/css/fusion-mirrors.scss` scopes styles to the explorer container.
- `src/js/fusion-mirrors.js` requests images, settings, and individual values.
- `services/fusion-mirrors/` contains the private-data service and its tests.
- `tests/test_fusion_mirrors.py` checks the integrated page with synthetic data.

[Service configuration](../services/fusion-mirrors/README.md) describes the
API, quotas, private storage, and reverse-proxy requirements. The tools
entry remains hidden until deployment checks pass.

This work was supported by the Seaver Institute.
