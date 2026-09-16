"""Browser checks. No real DFT data are embedded; fixtures are synthetic only."""
import argparse
import csv
import functools
import gzip
import json
import re
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Match production extensionless HTML navigation for local review.
        target = self.path.split('?', 1)[0]
        if not Path(target).suffix and Path(self.directory, target.lstrip('/') + '.html').is_file():
            self.path = target + '.html'
        super().do_GET()

    def log_message(self, *args):
        pass


def synthetic_export(root):
    """Intentionally nonphysical data solely for deterministic UI tests."""
    columns = ['wavelength_nm', 'energy_eV']
    columns += [f'{q}_{axis}' for axis in ['mode1', 'mode2', 'x', 'y', 'z'] for q in ['n', 'k']]
    columns += ['R_unpolarized_percent', 'R_x_percent', 'R_y_percent', 'finite_epsilon',
                'passive_epsilon', 'rounding_uncertain_absorption', 'valid_normal_z']
    root.mkdir(parents=True)
    materials = []
    for mid in ['TestMetal', 'TestOxide']:
        runs = {}
        for branch in ['PBE', 'GW']:
            channels = {}
            for channel in ['density', 'current']:
                scopes = {}
                for scope in ['native', 'screening']:
                    stem = f'{mid}/{branch}/{scope}_{channel}'
                    path = root / 'spectra' / (stem + '.json')
                    path.parent.mkdir(parents=True, exist_ok=True)
                    rows = []
                    for w in [200, 300, 400, 532, 700, 1064, 1200]:
                        valid = not (mid == 'TestOxide' and w == 400 and channel == 'density')
                        rows.append([w, 1.0] + [2.0, 0.5] * 5 + [40.0, 35.0, 45.0, True, valid, False, valid])
                    path.write_text(json.dumps({'columns': columns, 'rows': rows}))
                    source = root / 'source_csv' / (stem + '.csv.gz')
                    source.parent.mkdir(parents=True, exist_ok=True)
                    source.write_bytes(gzip.compress(b'SYNTHETIC_UI_TEST_ONLY\nnot_scientific_data\n', mtime=0))
                    scopes[scope] = {'url': 'data/' + path.relative_to(root).as_posix(), 'range_nm': [200, 1200],
                                     'sources': [{'kind': 'optical-constants',
                                                  'download': 'data/' + source.relative_to(root).as_posix()}]}
                channels[channel] = scopes
            runs[branch] = {'metadata': {'method': 'SYNTHETIC UI TEST ONLY', 'formula': mid}, 'channels': channels}
        materials.append({'id': mid, 'family': 'test', 'excluded': False, 'runs': runs})
    (root / 'catalog.json').write_text(json.dumps({'schema_version': 1, 'families': {'test': 'Synthetic test only'},
                                                'materials': materials}))


def normalize_html(text):
    return re.sub(r'\?v=[0-9a-f]+', '?v=HASH', text)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True, help='Review output outside the repository')
    parser.add_argument('--baseline', type=Path, help='Optional untouched dev build for regression checks')
    parser.add_argument('--private-data', type=Path, help='Optional authorized data folder; never committed')
    args = parser.parse_args()
    dist, out = args.dist.resolve(), args.output.resolve()
    repo = Path(__file__).resolve().parents[1]
    if out.is_relative_to(repo):
        raise ValueError('Keep all review outputs outside the Git checkout')
    out.mkdir(parents=True, exist_ok=True)
    public = out / 'public-code-only'
    public.mkdir(exist_ok=True)
    report = {'checks': [], 'private_checks': 0, 'failures': []}

    def check(condition, label):
        if not condition:
            raise AssertionError(label)
        report['checks'].append(label)

    if args.baseline:
        for name in ['index', 'jobs', 'news', 'publications', 'research', 'teaching', 'team', 'workshops']:
            check(normalize_html((dist / (name + '.html')).read_text()) ==
                  normalize_html((args.baseline / (name + '.html')).read_text()), f'Existing {name} HTML unchanged except asset hash')
        for file in ['css/main.css', 'css/shell.css', 'js/cite.js', 'js/citations.js', 'js/jobs.js', 'js/slideshow.js']:
            check((dist / file).read_bytes() == (args.baseline / file).read_bytes(), f'Shared asset unchanged: {file}')

    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with tempfile.TemporaryDirectory(prefix='fusion-mirror-synthetic-') as tmp, sync_playwright() as pw:
            fixture = Path(tmp) / 'data'
            synthetic_export(fixture)
            browser = pw.chromium.launch()
            context = browser.new_context(viewport={'width': 1440, 'height': 1100}, accept_downloads=True)
            page = context.new_page()
            errors, requests = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('request', lambda r: requests.append((r.method, r.url)))
            # No external fonts/analytics required for deterministic offline screenshots.
            context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin)
                          or route.request.url.startswith(('blob:', 'data:')) else route.abort())
            page.goto(origin + '/fusion-mirror')
            page.locator('body[data-ready="empty"]').wait_for()
            check(page.locator('#material').is_disabled(), 'Unloaded controls disabled')
            check(page.locator('#fusion-mirror-app').get_by_text('This work was supported by the Seaver Institute.', exact=False).count() == 1,
                  'Seaver Institute acknowledgement present')
            check(page.locator('script[src*="googletagmanager"]').count() == 0, 'No analytics script on explorer')
            check(not any('/data/' in url for _, url in requests), 'No automatic dataset request')
            page.screenshot(path=str(public / 'fusion-mirror-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No horizontal overflow at 390 px')
            page.screenshot(path=str(public / 'fusion-mirror-mobile.png'), full_page=True)
            page.set_viewport_size({'width': 1440, 'height': 1100})
            page.goto(origin + '/tools')
            check(page.get_by_role('link', name='Open CHAOS', exact=True).count() == 1, 'CHAOS entry retained')
            check(page.get_by_role('link', name='Open LOOP', exact=True).count() == 1, 'LOOP entry retained')
            check(page.get_by_role('link', name='Open Fusion Mirror', exact=True).count() == 1, 'Fusion Mirror Tools entry')
            page.screenshot(path=str(public / 'tools-desktop.png'), full_page=True)
            page.get_by_role('link', name='Open Fusion Mirror', exact=True).click()
            page.locator('#local-folder').set_input_files(str(fixture))
            page.locator('body[data-ready="true"]').wait_for()
            check(page.locator('#chart-R svg').count() == 1, 'Local folder produces charts')
            check(page.evaluate('DFTExplorer.getRows().length') == 7, 'Exact synthetic samples retained')
            check('?' not in page.url, 'No private selection in URL')
            page.select_option('#branch', 'both')
            page.locator('body[data-ready="true"]').wait_for()
            check(page.locator('#chart-R [data-series]').count() == 2, 'Two PAW curves compared')
            page.locator('[data-range="uv"]').click()
            page.locator('body[data-ready="true"]').wait_for()
            check(all(200 <= r['wavelength_nm'] <= 400 for r in page.evaluate('DFTExplorer.getRows()')), 'UV window filter')
            with page.expect_download() as event:
                page.click('#download-csv')
            rows = list(csv.DictReader(Path(event.value.path()).read_text().splitlines()))
            check(len(rows) == 6 and all(float(r['wavelength_nm']) <= 400 for r in rows), 'CSV contains exact selected window and both branches')
            page.select_option('#material', 'TestOxide')
            page.locator('body[data-ready="true"]').wait_for()
            gaps = [r for r in page.evaluate('DFTExplorer.getRows()') if r['wavelength_nm'] == 400]
            check(all(r['n'] is None and r['k'] is None and r['R_percent'] is None for r in gaps), 'Invalid samples masked, not zero-filled')
            page.fill('#probe-wl', '400')
            page.locator('#probe-form button[type=submit]').click()
            check('unavailable values' in page.inner_text('#probe-result'), 'Wavelength probe preserves gap')
            page.fill('#probe-wl', '1064')
            page.locator('#probe-form button[type=submit]').click()
            check('outside the sampled window' in page.inner_text('#probe-result'), 'Probe refuses extrapolation')
            page.locator('[data-range="all"]').click()
            page.locator('body[data-ready="true"]').wait_for()
            for fmt in ['svg', 'png']:
                with page.expect_download() as event:
                    page.locator(f'[data-download="R"][data-format="{fmt}"]').click()
                payload = Path(event.value.path()).read_bytes()
                check(payload.startswith(b'\x89PNG') if fmt == 'png' else b'<svg' in payload, f'{fmt.upper()} export works')
            page.locator('#provenance details').first.locator('summary').click()
            with page.expect_download() as event:
                page.locator('#provenance .source-links button').first.click()
            check(gzip.decompress(Path(event.value.path()).read_bytes()).startswith(b'SYNTHETIC_UI_TEST_ONLY'), 'Original source gzip downloaded locally')
            page.fill('#min-wl', '800')
            page.fill('#max-wl', '700')
            page.locator('#range-form button[type=submit]').click()
            check('higher upper wavelength' in page.inner_text('#status'), 'Reversed range rejected')
            page.reload()
            page.locator('body[data-ready="empty"]').wait_for()
            check(page.locator('#material').is_disabled(), 'Reload clears private data selection')
            broken = Path(tmp) / 'broken'
            broken.mkdir()
            (broken / 'catalog.json').write_text('{"schema_version":99}')
            page.locator('#local-folder').set_input_files(str(broken))
            page.locator('body[data-ready="error"]').wait_for()
            check(page.locator('#material').is_disabled(), 'Malformed catalogue handled safely')

            if args.private_data:
                private_out = out / 'PRIVATE-do-not-publish'
                private_out.mkdir(exist_ok=True)
                source_root = args.private_data.resolve()
                catalog = json.loads((source_root / 'catalog.json').read_text())
                page.locator('#local-folder').set_input_files(str(source_root))
                page.locator('body[data-ready="true"]').wait_for(timeout=60000)
                check(page.inner_text('#total-materials') == str(len(catalog['materials'])), 'Private catalogue count matches input')
                # Validate every spectrum file's structural contract without copying any source data.
                nfiles = 0
                for m in catalog['materials']:
                    for run in m['runs'].values():
                        for channel in run['channels'].values():
                            for spec in channel.values():
                                p = source_root / spec['url'].removeprefix('data/')
                                d = json.loads(p.read_text())
                                wi = d['columns'].index('wavelength_nm')
                                wavelengths = [r[wi] for r in d['rows']]
                                assert 0 < len(wavelengths) <= 10000
                                assert all(w > 0 for w in wavelengths)
                                assert all(a < b for a, b in zip(wavelengths, wavelengths[1:]))
                                assert all(len(r) == len(d['columns']) for r in d['rows'])
                                nfiles += 1
                check(nfiles > 0, f'All {nfiles} private spectrum schemas validated')
                # Illustrative ids only. Ids absent from the loaded catalogue are
                # skipped, and if none match the first entries are exercised instead,
                # so the checks below run against whatever authorized set is supplied.
                sample_ids = ['Cu', 'Ni', 'Ti', 'Cr', 'Al2O3', 'Ta', 'Zn', 'SrTiO3']
                present = [m['id'] for m in catalog['materials'] if m['id'] in sample_ids]
                if not present:
                    present = [m['id'] for m in catalog['materials'][:len(sample_ids)]]
                for mid in present:
                    material = next(m for m in catalog['materials'] if m['id'] == mid)
                    page.select_option('#material', mid)
                    page.locator('body[data-ready="true"]').wait_for()
                    for branch, run in material['runs'].items():
                        page.select_option('#branch', branch)
                        page.locator('body[data-ready="true"]').wait_for()
                        for channel in ['density', 'current']:
                            page.select_option('#channel', channel)
                            page.locator('body[data-ready="true"]').wait_for()
                            for scope in ['screening', 'native']:
                                page.select_option('#sampling', scope)
                                page.locator('body[data-ready="true"]').wait_for()
                                if scope == 'native':
                                    page.locator('[data-range="full"]').click()
                                    page.locator('body[data-ready="true"]').wait_for()
                                spec = run['channels'][channel][scope]
                                raw = json.loads((source_root / spec['url'].removeprefix('data/')).read_text())
                                index = {k: i for i, k in enumerate(raw['columns'])}
                                state = page.evaluate('DFTExplorer.getState()')
                                expected = [r for r in raw['rows'] if state['min'] <= r[index['wavelength_nm']] <= state['max']]
                                actual = page.evaluate('DFTExplorer.getRows()')
                                assert len(actual) == len(expected)
                                for got, row in zip(actual, expected):
                                    valid_nk = row[index['finite_epsilon']] and row[index['passive_epsilon']]
                                    for key, col in [('n', 'n_mode1'), ('k', 'k_mode1'), ('R_percent', 'R_unpolarized_percent')]:
                                        valid = row[index['valid_normal_z']] if key == 'R_percent' else valid_nk
                                        assert got[key] == (row[index[col]] if valid else None), (mid, branch, channel, scope, key)
                                        report['private_checks'] += 1
                shot_id = present[0]
                page.select_option('#material', shot_id)
                page.locator('body[data-ready="true"]').wait_for()
                page.select_option('#branch', 'both')
                page.locator('body[data-ready="true"]').wait_for()
                page.select_option('#channel', 'density')
                page.locator('body[data-ready="true"]').wait_for()
                page.select_option('#sampling', 'screening')
                page.locator('body[data-ready="true"]').wait_for()
                page.locator('[data-range="all"]').click()
                page.locator('body[data-ready="true"]').wait_for()
                page.locator('#fusion-mirror-app').screenshot(path=str(private_out / f'{shot_id}-private-desktop.png'))
                page.locator('.charts').screenshot(path=str(private_out / f'{shot_id}-private-plots.png'))
                page.set_viewport_size({'width': 390, 'height': 844})
                check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Loaded private plots fit mobile width')
                page.locator('.charts').screenshot(path=str(private_out / f'{shot_id}-private-mobile-plots.png'))
                page.set_viewport_size({'width': 1440, 'height': 1100})
                gap_id = present[-1]
                page.select_option('#material', gap_id)
                page.locator('body[data-ready="true"]').wait_for()
                page.locator('.charts').screenshot(path=str(private_out / f'{gap_id}-private-validity-gaps.png'))
                (private_out / 'README.txt').write_text('PRIVATE: screenshots contain unpublished DFT values. Do not attach to public PRs.\n')

            check(not errors, 'No browser JavaScript errors: ' + repr(errors))
            check(not any(method not in ['GET', 'HEAD'] for method, _ in requests), 'No upload requests')
            check(not any('/data/' in url for _, url in requests), 'No network requests for selected DFT files')
            browser.close()
        report['result'] = 'PASS'
    except Exception as exc:
        report['result'] = 'FAIL'
        report['failures'].append(str(exc))
        raise
    finally:
        server.shutdown()
        (out / 'validation-report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
