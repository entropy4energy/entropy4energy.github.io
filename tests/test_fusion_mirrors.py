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
    def service(self):
        from urllib.parse import urlsplit
        from wsgiref.util import setup_testing_defaults
        parsed=urlsplit(self.path)
        env={};setup_testing_defaults(env)
        env.update(PATH_INFO=parsed.path, QUERY_STRING=parsed.query,
                   REQUEST_METHOD=self.command, REMOTE_ADDR='localhost',
                   CONTENT_TYPE=self.headers.get('Content-Type',''),
                   CONTENT_LENGTH=self.headers.get('Content-Length','0'),
                   HTTP_ORIGIN=self.headers.get('Origin',''),
                   HTTP_HOST=self.headers.get('Host',''), **{'wsgi.input':self.rfile})
        result={}
        body=b''.join(self.server.app(env,lambda status,headers:result.update(status=status,headers=headers)))
        self.send_response(int(result['status'].split()[0]))
        for key,value in result['headers']:self.send_header(key,value)
        self.end_headers();self.wfile.write(body)

    def do_GET(self):
        target=self.path.split('?',1)[0]
        if target.startswith('/fusion-mirrors/api/'):
            return self.service()
        if target.rstrip('/')=='/fusion-mirrors':
            self.path='/fusion-mirrors.html'
        super().do_GET()

    def do_POST(self):
        return self.service()

    def log_message(self,*args):
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
    import sys
    from urllib.request import urlopen
    repo=Path(__file__).resolve().parents[1]
    sys.path.insert(0,str(repo/'services/fusion-mirrors/app'))
    from server import App
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--baseline',type=Path)
    args=parser.parse_args()
    dist,out=args.dist.resolve(),args.output.resolve()
    out.mkdir(parents=True,exist_ok=True)
    if args.baseline:
        for name in ['index','jobs','news','publications','research','teaching','team','workshops']:
            assert normalize_html((dist/(name+'.html')).read_text())==normalize_html((args.baseline/(name+'.html')).read_text()),name
    with tempfile.TemporaryDirectory(dir=out,prefix='fixture-') as tmp:
        root=Path(tmp);synthetic_export(root/'data')
        app=App(root,root/'quota.sqlite3')
        server=ThreadingHTTPServer(('localhost',0),functools.partial(Handler,directory=str(dist)))
        server.app=app
        origin='http://localhost:'+str(server.server_port)
        app.origin=origin
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        checks=[]
        try:
            with sync_playwright() as pw:
                browser=pw.chromium.launch()
                page=browser.new_page(viewport={'width':1440,'height':1000})
                page.goto(origin+'/fusion-mirrors')
                page.locator('#spectra').wait_for(state='visible')
                assert page.locator('#material').input_value()=='TestMetal'
                assert page.locator('header').count()==1
                assert page.locator('#local-folder').count()==0
                assert page.locator('#download-csv').count()==0
                assert page.locator('#references a').count()==3
                checks.append('shared shell and controlled explorer load')
                with page.expect_response(lambda r:'/api/probe' in r.url) as response:
                    page.get_by_role('button',name='532 nm',exact=True).click()
                result=response.value.json()
                assert result['values'][0]['R']==40
                assert '40' in page.locator('#probe-result').inner_text()
                checks.append('single wavelength value')
                page.get_by_label('PAW dataset',exact=True).select_option('both')
                with page.expect_response(lambda r:'/api/plot' in r.url):
                    page.get_by_role('button',name='View spectra',exact=True).click()
                with page.expect_response(lambda r:'/api/probe' in r.url) as response:
                    page.get_by_role('button',name='1064 nm',exact=True).click()
                assert len(response.value.json()['values'])==2
                checks.append('both PAW datasets')
                page.get_by_label('Material',exact=True).select_option('TestOxide')
                with page.expect_response(lambda r:'/api/plot' in r.url):
                    page.get_by_role('button',name='View spectra',exact=True).click()
                page.locator('#wavelength').fill('400')
                with page.expect_response(lambda r:'/api/probe' in r.url) as response:
                    page.get_by_role('button',name='Look up',exact=True).click()
                assert response.value.json()['values'][0]['R'] is None
                assert 'Unavailable' in page.locator('#probe-result').inner_text()
                checks.append('invalid optical samples remain unavailable')
                page.screenshot(path=str(out/'desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844})
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1')
                page.screenshot(path=str(out/'mobile.png'),full_page=True)
                checks.append('mobile layout has no horizontal overflow')
                browser.close()
        finally:
            server.shutdown();server.server_close();thread.join()
    (out/'report.json').write_text(json.dumps({'checks':checks},indent=2))
    print('Passed:',len(checks),'browser checks')

if __name__=='__main__':
    main()
