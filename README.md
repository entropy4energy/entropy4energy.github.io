# S4E website · Fusion Mirror integration

The Entropy for Energy Laboratory website includes Fusion Mirrors, a DFT optical materials explorer. The explorer uses the existing S4E header, navigation, sidebar, footer, and color tokens. Its Data and Tools entry remains hidden until the private-data service is verified.

## Local development

Use Python 3 with `requirements.txt`, Node.js 24, npm, Java (for the existing Closure compiler), GNU Make and rsync.

```sh
python -m venv venv
venv/bin/pip install -r requirements.txt
npm ci
make
python -m http.server 8080 --bind localhost --directory dist
```

Open `http://localhost:8080/fusion-mirrors.html` for the static shell. Interactive queries require the data service proxy described below. The production server supports extensionless links; Python's basic server needs `.html` when opening the Tools and Fusion Mirror pages directly. Do not serve a parent directory containing private data.

## What is included

- `src/templates/fusion-mirrors.html`: interface, scope and acknowledgement.
- `src/css/fusion-mirrors.scss`: styling scoped to this tool, using S4E navy `#002D72` and white.
- `src/js/fusion-mirrors.js`: server-generated plots, individual wavelength queries, and source references. No runtime JavaScript dependencies.
- `services/fusion-mirrors/`: WSGI data service, deployment notes, and access tests.
- `src/data/fusion-mirrors.json` and the entry in `tools.json`: product metadata only, **not DFT values**.
- `tests/test_fusion_mirrors.py`: browser checks using clearly synthetic fixtures generated in a temporary directory. Review output stays in an ignored directory.
- [Methods, data contract and release notes](docs/fusion-mirrors.md).

## Data and privacy

The numerical package stays outside the website repository and public web
root. Visitors receive PNG plots, individual wavelength results, method
references, and selected calculation settings. The service has no bulk
CSV, archive, raw-file, or spectrum-array endpoint.

The production page retains the existing usage record for view choices and
requested wavelengths, without calculated values or source-file paths.
Local previews send no usage events. Copyable view links contain the
selected material, PAW branch, response, and wavelength band.

The calculations use independent-particle PBE. GW labels identify
GW-oriented PAW datasets within PBE. The current service presents DFT
bare-interface spectra. See [methods and access](docs/fusion-mirrors.md)
and [service configuration](services/fusion-mirrors/README.md).

## Review and deployment

The dedicated workflow builds the page, runs the service access tests, and
checks the integrated browser experience using synthetic fixtures. Test
outputs belong in ignored `review-output/` directories.

Submit changes on a feature branch with **dev as the PR base**. The static
site and WSGI service have separate deployment steps. Keep Fusion Mirrors
hidden until the private package, reverse proxy, and public endpoint checks
are verified. The normal static build does not start the WSGI service.

## Acknowledgement

This work was supported by the **Seaver Institute**.
