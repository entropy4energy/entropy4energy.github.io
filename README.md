# S4E website · Fusion Mirror integration

The Entropy for Energy Laboratory website, including a code-only preview of **Fusion Mirror**, a DFT optical materials explorer. Fusion Mirror appears under **Data and Tools**, alongside CHAOS and LOOP, and uses the existing S4E header, navigation, sidebar, footer and colour tokens.

## Local development

Use Python 3 with `requirements.txt`, Node.js 24, npm, Java (for the existing Closure compiler), GNU Make and rsync.

```sh
python -m venv venv
venv/bin/pip install -r requirements.txt
npm ci
make
python -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8080/fusion-mirrors.html`. The production server supports extensionless links; Python's basic server needs `.html` when opening the Tools and Fusion Mirror pages directly. Do not serve a parent directory containing private data.

## What is included

- `src/templates/fusion-mirrors.html`: interface, scope and acknowledgement.
- `src/css/fusion-mirrors.scss`: styling scoped to this tool, using S4E navy `#002D72` and white.
- `src/js/fusion-mirrors.js`: local-file loading, plotting, validity masks, wavelength lookup and downloads. No runtime JavaScript dependencies.
- `src/data/fusion-mirrors.json` and the entry in `tools.json`: product metadata only, **not DFT values**.
- `tests/test_fusion_mirrors.py`: browser checks using clearly synthetic fixtures generated in a temporary directory. Optional private-data verification writes only to an explicitly chosen review directory.
- [Methods, data contract and release notes](docs/fusion-mirrors.md).

## Data and privacy

This PR does **not** release the unpublished DFT data. There is no dataset in the repository, no remote-data URL and no upload API. A reviewer with authorized data can select an existing explorer export's `data/` folder, containing `catalog.json`, `spectra/` and `source_csv/`. The folder picker selects files on the computer running the browser, not on a remote SSH server. File contents are read locally in the browser. Reloading clears the selection. Local material choices are not placed in the URL or persistent browser storage, and the new page does not load the site's analytics script.

The underlying calculations are VASP independent-particle PBE dielectric responses. “GW” labels denote GW-oriented PAW potentials used within PBE; they are not quasiparticle GW results. The explorer reads preprocessed optical constants and full-tensor normal-incidence Air/material reflectivity. It does not run VASP, recalculate TMM, mix response channels, extrapolate missing data or introduce spectral averages.

Raw calculations, reproduction scripts, heavy analysis and source CSVs remain in the separate controlled DFT release. No VASP software or PAW potential files are included. Public hosting, data licensing, a versioned mirror address and the manuscript citation require separate approval. Exported CSVs, figures and metadata can contain unpublished results: do not add those exports or loaded-data screenshots to a public PR.

## Review and tests

```sh
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/test_fusion_mirrors.py --dist dist --output /tmp/fusion-mirrors-review
```

The test starts a loopback-only server, checks desktop/mobile rendering, folder import, quality gaps, PAW comparison, selected-window exports, source downloads and failure handling. Its public screenshots show the **unloaded** page only. Private-data testing is opt-in; see `--help`. Never commit test output.

Submit changes on a feature branch with **`dev` as the PR base**. Do not merge or deploy as part of this review. The existing deployment workflow is left unchanged; a dedicated Fusion Mirror check tests the PR checkout itself.

## Acknowledgement

This work was supported by the **Seaver Institute**.
