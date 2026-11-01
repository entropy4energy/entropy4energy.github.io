"""Bounded optical queries and raster plots over a private spectrum catalog."""
import hashlib
import io
import json
import math
import os
import re
import sqlite3
import time
from bisect import bisect_left
from functools import lru_cache
from ipaddress import ip_address
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qs
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
PREFIX = '/fusion-mirrors'
BANDS = {'all': (200, 1200), 'uv': (200, 400), 'visible': (400, 700), 'nir': (700, 1200)}
BRANCHES = {'PBE': 'Standard PAW / PBE', 'GW': 'GW-oriented PAW / PBE'}
FIELDS = {'n': 'n_mode1', 'k': 'k_mode1', 'R': 'R_unpolarized_percent'}
PLOT_LAYOUTS = {
    'R': {'width': 1040, 'height': 430, 'panels': [{'field': 'R', 'left': 85, 'right': 1000, 'top': 80, 'bottom': 315}]},
    'all': {'width': 1040, 'height': 720, 'panels': [
        {'field': field, 'left': 85, 'right': 1000, 'top': top, 'bottom': top+142}
        for field, top in [('R', 72), ('n', 272), ('k', 472)]]},
}


def draw_curve(draw, points, color, pattern=()):
    if len(points) == 1:
        x,y=points[0];draw.ellipse((x-2,y-2,x+2,y+2),fill=color)
    elif not pattern:
        if points: draw.line(points,fill=color,width=3)
    else:
        phase=0;remaining=pattern[0]
        for (x0,y0),(x1,y1) in zip(points,points[1:]):
            length=math.hypot(x1-x0,y1-y0)
            if not length: continue
            offset=0
            while offset < length:
                step=min(remaining,length-offset)
                if phase % 2 == 0:
                    a=offset/length;b=(offset+step)/length
                    draw.line((x0+(x1-x0)*a,y0+(y1-y0)*a,x0+(x1-x0)*b,y0+(y1-y0)*b),fill=color,width=3)
                offset+=step;remaining-=step
                if remaining < 1e-8:
                    phase=(phase+1)%len(pattern);remaining=pattern[phase]

REFERENCES = [
    {'title': 'Kresse and Furthmüller, Physical Review B 54, 11169 (1996)', 'url': 'https://doi.org/10.1103/PhysRevB.54.11169'},
    {'title': 'Perdew, Burke, and Ernzerhof, Physical Review Letters 77, 3865 (1996)', 'url': 'https://doi.org/10.1103/PhysRevLett.77.3865'},
    {'title': 'Gajdoš et al., Physical Review B 73, 045112 (2006)', 'url': 'https://doi.org/10.1103/PhysRevB.73.045112'},
]

def draw_formula(draw, position, identifier, font, subscript, fill):
    formula={'C_graphene':'C (graphene)','CaMg_CO3_2':'CaMg(CO3)2'}.get(identifier,identifier)
    x,y=position
    for part in re.findall(r'\d+|[^\d]+',formula):
        numeric=part.isdigit();face=subscript if numeric else font
        draw.text((x,y+7 if numeric else y),part,font=face,fill=fill)
        x+=draw.textlength(part,font=face)
    return x


class QueryError(Exception):
    pass

class Store:
    def __init__(self, root):
        self.root = Path(root).resolve()
        if self.root == HERE or self.root.is_relative_to(HERE):
            raise ValueError('The dataset must be stored outside the application directory.')
        self.catalog = json.loads((self.root/'data/catalog.json').read_text())
        self.materials = {m['id']: m for m in self.catalog['materials'] if not m.get('excluded', False)}
        self.families = self.catalog['families']

    def public_catalog(self):
        return {'materials': [{'id': m['id'], 'family': m['family'], 'branches': list(m['runs'])}
                              for m in self.materials.values()], 'families': self.families,
                'references': REFERENCES, 'plot_layouts': PLOT_LAYOUTS, 'bands': BANDS}

    def selection(self, query):
        if set(query) - {'material', 'branch', 'channel', 'band', 'wavelength', 'quantity', 'compare'}:
            raise QueryError('Unsupported query field.')
        if query.get('quantity', 'all') not in {'all', 'R'}:
            raise QueryError('Choose reflectivity or all optical properties.')
        mid = query.get('material', 'Rh')
        if mid not in self.materials:
            raise QueryError('Choose an available material.')
        branch = query.get('branch', 'PBE')
        if branch not in {'PBE', 'GW', 'both'}:
            raise QueryError('Choose an available PAW dataset.')
        material = self.materials[mid]
        branches = [b for b in ('PBE', 'GW') if b in material['runs']] if branch == 'both' else [branch]
        if any(b not in material['runs'] for b in branches):
            raise QueryError('This PAW dataset is unavailable for the material.')
        channel = query.get('channel', 'density')
        band = query.get('band', 'all')
        if channel not in {'density', 'current'} or band not in BANDS:
            raise QueryError('Choose a supported response and wavelength band.')
        comparison = query.get('compare', '')
        if not isinstance(comparison, str):
            raise QueryError('Choose at most two comparison materials.')
        mids = [mid] + (comparison.split(',') if comparison else [])
        if len(mids) > 3 or len(set(mids)) != len(mids) or any(m not in self.materials for m in mids):
            raise QueryError('Choose up to three different available materials.')
        if len(mids) > 1 and branch == 'both':
            raise QueryError('Compare materials with one PAW dataset, or compare PAW datasets for one material.')
        if any(b not in self.materials[m]['runs'] for m in mids for b in branches):
            raise QueryError('The selected PAW dataset is unavailable for a comparison material.')
        return mid, branches, channel, band

    def selected_series(self, query):
        mid, branches, channel, band = self.selection(query)
        mids = [mid] + (query['compare'].split(',') if query.get('compare') else [])
        return [(m, b) for m in mids for b in branches], channel, band

    @lru_cache(maxsize=24)
    def spectrum(self, mid, branch, channel):
        rel = self.materials[mid]['runs'][branch]['channels'][channel]['screening']['url']
        parts = PurePosixPath(rel)
        if parts.is_absolute() or '..' in parts.parts or '\\' in rel or not rel.startswith('data/spectra/'):
            raise QueryError('Spectrum reference failed validation.')
        path = (self.root/rel).resolve()
        if not path.is_relative_to(self.root) or not path.is_file():
            raise QueryError('Spectrum is unavailable.')
        data = json.loads(path.read_text())
        columns, rows = data['columns'], data['rows']
        required = {'wavelength_nm', 'finite_epsilon', 'passive_epsilon', 'valid_normal_z'} | set(FIELDS.values())
        if not required.issubset(columns) or len(set(columns)) != len(columns):
            raise QueryError('Spectrum columns failed validation.')
        index = {name: i for i, name in enumerate(columns)}
        wavelengths = [row[index['wavelength_nm']] for row in rows]
        if (not rows or len(rows) > 10000 or any(len(r) != len(columns) for r in rows)
            or any(not isinstance(w, (int, float)) or not math.isfinite(w) or w <= 0 for w in wavelengths)
            or any(b <= a for a, b in zip(wavelengths, wavelengths[1:]))):
            raise QueryError('Spectrum sampling failed validation.')
        return rows, index, wavelengths

    @staticmethod
    def value(row, index, field):
        flags = ['valid_normal_z'] if field == 'R' else ['finite_epsilon', 'passive_epsilon']
        value = row[index[FIELDS[field]]]
        if all(row[index[flag]] is True for flag in flags) and isinstance(value, (int, float)) and math.isfinite(value):
            return value
        return None

    def provenance(self, query):
        series, channel, band = self.selected_series(query)
        safe = ('formula', 'ENCUT_eV', 'EDIFF_eV', 'NBANDS_effective', 'CSHIFT_eV', 'method')
        return {'material': series[0][0], 'materials': list(dict.fromkeys(m for m,b in series)),
                'family': self.families[self.materials[series[0][0]]['family']],
                'calculations': [{'material': mid, 'branch': BRANCHES[b], 'settings': {k: v for k, v in
                 self.materials[mid]['runs'][b]['metadata'].items() if k in safe}} for mid,b in series],
                'references': REFERENCES}

    def probe(self, query):
        series, channel, band = self.selected_series(query)
        try:
            wavelength = float(query['wavelength'])
        except (ValueError, TypeError, KeyError):
            raise QueryError('Enter one wavelength between 200 and 1200 nm.')
        if not math.isfinite(wavelength) or not 200 <= wavelength <= 1200:
            raise QueryError('Enter one wavelength between 200 and 1200 nm.')
        lo, hi = BANDS[band]
        if not lo <= wavelength <= hi:
            raise QueryError('The wavelength is outside the selected band.')
        values = []
        for mid, branch in series:
            rows, index, wavelengths = self.spectrum(mid, branch, channel)
            result = {'material': mid, 'branch': BRANCHES[branch], 'requested_nm': wavelength, 'sample_nm': None,
                      'offset_nm': None, 'n': None, 'k': None, 'R': None}
            if wavelengths[0] <= wavelength <= wavelengths[-1]:
                i = bisect_left(wavelengths, wavelength)
                candidates = [j for j in (i-1, i) if 0 <= j < len(rows) and lo <= wavelengths[j] <= hi]
                if candidates:
                    j = min(candidates, key=lambda j: abs(wavelengths[j]-wavelength))
                    result.update(sample_nm=wavelengths[j], offset_nm=round(wavelengths[j]-wavelength, 4))
                    for field in FIELDS:
                        v = self.value(rows[j], index, field)
                        result[field] = float(f'{v:.4g}') if v is not None else None
            values.append(result)
        return {'material': series[0][0], 'values': values}

    def plot(self, query):
        selected, channel, band = self.selected_series(query)
        lo, hi = BANDS[band]
        reflectivity_only = query.get('quantity') == 'R'
        layout = PLOT_LAYOUTS['R' if reflectivity_only else 'all']
        image = Image.new('RGB', (layout['width'], layout['height']), 'white')
        draw = ImageDraw.Draw(image)
        font = ImageFont.truetype(str(HERE/'fonts/WorkSans-Regular.ttf'), size=17)
        small = ImageFont.truetype(str(HERE/'fonts/WorkSans-Regular.ttf'), size=14)
        title = ImageFont.truetype(str(HERE/'fonts/WorkSans-Regular.ttf'), size=23)
        variable = ImageFont.truetype(str(HERE/'fonts/WorkSans-Italic.ttf'), size=17)
        mids=list(dict.fromkeys(m for m,b in selected))
        if len(mids)==1:
            x=draw_formula(draw,(70,10),mids[0],title,small,'#002d72')
        else:
            draw.text((70,10),'Material comparison',fill='#002d72',font=title)
            x=70+draw.textlength('Material comparison',font=title)
        draw.text((x,10),f'  |  {channel} response  |  normal incidence',fill='#002d72',font=title)
        colors = ['#002d72', '#a53b00', '#00624e']
        patterns = [(), (12,6), (3,5)]
        for panel_index, panel in enumerate(layout['panels']):
            field=panel['field'];left=panel['left'];right=panel['right'];top=panel['top'];bottom=panel['bottom']
            for start, end, label, color in [(200,400,'UV','#ddccf4'), (400,700,'Visible','#bee7c9'), (700,1200,'Near-IR','#c2dcf5')]:
                a,b=max(lo,start),min(hi,end)
                if b>a:
                    x1=left+(a-lo)/(hi-lo)*(right-left);x2=left+(b-lo)/(hi-lo)*(right-left)
                    draw.rectangle((x1,top,x2,bottom),fill=color)
                    if panel_index==0:draw.text(((x1+x2)/2,top-27),label,fill='#263849',font=font,anchor='mt')
            series = []
            for mid, branch in selected:
                rows, index, wavelengths = self.spectrum(mid, branch, channel)
                points = [(w, self.value(row, index, field)) for row, w in zip(rows, wavelengths) if lo <= w <= hi]
                series.append(points)
            finite = [v for points in series for _, v in points if v is not None]
            ylo, yhi = (0, 100) if field == 'R' else (min([0]+finite), max([1]+finite)*1.08)
            if field == 'R' and finite:
                ylo, yhi = min(0, min(finite)), max(100, max(finite))
            draw.text((left-55, top-24), field, fill='#002d72', font=variable)
            if field == 'R':
                draw.text((left-55+draw.textlength(field, font=variable), top-24), ' (%)', fill='#002d72', font=font)
            for t in range(5):
                y = bottom-(bottom-top)*t/4
                draw.line([(left,y),(right,y)], fill='#aab5c0')
                v = ylo+(yhi-ylo)*t/4
                draw.text((left-52,y-7), f'{v:.3g}', fill='#536273', font=small)
                x = left+(right-left)*t/4
                draw.text((x-14,bottom+7), f'{lo+(hi-lo)*t/4:g}', fill='#536273', font=small)
            draw.line([(left,top),(left,bottom),(right,bottom)], fill='#536273', width=1)
            for i, points in enumerate(series):
                segment=[]
                for w,v in points:
                    if v is None:
                        draw_curve(draw,segment,colors[i],patterns[i]);segment=[]
                    else:
                        segment.append((left+(w-lo)/(hi-lo)*(right-left),bottom-(v-ylo)/(yhi-ylo)*(bottom-top)))
                draw_curve(draw,segment,colors[i],patterns[i])
            if not finite:
                draw.text((left+20,top+45),'No supported values in this band',fill='#536273',font=font)
        draw.text((435, 350 if reflectivity_only else 643), 'Wavelength (nm)', fill='#536273', font=font)
        for i,(mid,branch) in enumerate(selected):
            x=85+i*305;y=390 if reflectivity_only else 684
            draw_curve(draw,[(x,y+5),(x+28,y+5)],colors[i],patterns[i])
            draw_formula(draw,(x+36,y-5),mid,small,small,colors[i])
            draw.text((x+36,y+14),BRANCHES[branch],fill='#263849',font=small)
        stream = io.BytesIO(); image.save(stream, format='PNG')
        return stream.getvalue()

class Quotas:
    def __init__(self, path, plot_limit=120, probe_limit=40, global_limit=2400):
        self.path = str(path)
        self.limits = {'plot': plot_limit, 'probe': probe_limit, 'request': 1200}
        self.global_limit = global_limit
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.path) as db:
            db.execute('CREATE TABLE IF NOT EXISTS quotas (key TEXT PRIMARY KEY, count INTEGER NOT NULL)')

    def consume(self, identity, kind, now=None):
        day = int((time.time() if now is None else now)//86400)
        key = f'{day}:'+hashlib.sha256(identity.encode()).hexdigest()+':'+kind
        global_key = f'{day}:global'
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM quotas WHERE key NOT LIKE ?', (f'{day}:%',))
            buckets = [(key, self.limits[kind])]
            if kind == 'request':
                buckets.append((global_key, self.global_limit))
            for k, limit in buckets:
                current = db.execute('SELECT count FROM quotas WHERE key=?', (k,)).fetchone()
                if current and current[0] >= limit:
                    return False
            for k, _ in buckets:
                db.execute('INSERT INTO quotas VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1', (k,))
        return True

class App:
    def __init__(self, root, database, origin=None, trust_proxy=False, **limits):
        self.store = Store(root)
        self.quotas = Quotas(database, **limits)
        self.origin = origin
        self.trust_proxy = trust_proxy

    def __call__(self, env, start):
        path = env.get('PATH_INFO', '/')
        if not (path == PREFIX or path.startswith(PREFIX+'/')):
            path = '/missing'
        else:
            path = path[len(PREFIX):] or '/'
        peer = env.get('REMOTE_ADDR', 'unknown')
        if self.trust_proxy:
            try:
                if ip_address(peer).is_loopback:
                    # The proxy must replace this header, not append client input.
                    peer = env.get('HTTP_X_REAL_IP', peer)
            except ValueError:
                pass
        def response(status, body, content='application/json', extra=()):
            if isinstance(body, dict):
                body = json.dumps(body, allow_nan=False).encode()
            if isinstance(body, str):
                body = body.encode()
            headers = [('Content-Type', content), ('Content-Length', str(len(body))),
                       ('Cache-Control', 'private, no-store'), ('X-Content-Type-Options','nosniff'),
                       ('Referrer-Policy','same-origin'), ('X-Frame-Options','SAMEORIGIN'),
                       ('Content-Security-Policy', "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'")]+list(extra)
            start(status, headers)
            return [body]
        if not self.quotas.consume(peer, 'request'):
            return response('429 Too Many Requests', {'error':'Daily request limit reached. Please return tomorrow.'}, extra=[('Retry-After','86400')])
        method = env.get('REQUEST_METHOD', 'GET')
        if method == 'GET' and path == '/api/materials':
            return response('200 OK', self.store.public_catalog())
        try:
            if method == 'GET' and path in {'/api/plot', '/api/provenance'}:
                if len(env.get('QUERY_STRING','')) > 1024:
                    raise QueryError('The query is too long.')
                parsed = parse_qs(env.get('QUERY_STRING',''), keep_blank_values=True)
                if any(len(values)!=1 for values in parsed.values()):
                    raise QueryError('One selection per query is supported.')
                query = {k:v[0] for k,v in parsed.items()}
                if 'wavelength' in query:
                    raise QueryError('Use the wavelength lookup for individual values.')
                self.store.selection(query)
                if path == '/api/provenance':
                    return response('200 OK', self.store.provenance(query))
                if not self.quotas.consume(peer, 'plot'):
                    return response('429 Too Many Requests', {'error':'Daily plot limit reached.'}, extra=[('Retry-After','86400')])
                return response('200 OK', self.store.plot(query), 'image/png')
            if method == 'POST' and path == '/api/probe':
                expected = self.origin or (env.get('wsgi.url_scheme','http')+'://'+env.get('HTTP_HOST',''))
                if env.get('HTTP_ORIGIN') != expected:
                    return response('403 Forbidden', {'error':'Please make the query from the explorer.'})
                if env.get('CONTENT_TYPE','').split(';')[0] != 'application/json':
                    raise QueryError('A single JSON query is required.')
                size = int(env.get('CONTENT_LENGTH','0'))
                if not 0 < size <= 1024:
                    raise QueryError('One wavelength per query is supported.')
                query = json.loads(env['wsgi.input'].read(size))
                if not isinstance(query, dict) or any(not isinstance(v,str) for v in query.values()):
                    raise QueryError('One wavelength per query is supported.')
                result = self.store.probe(query)
                if not self.quotas.consume(peer, 'probe'):
                    return response('429 Too Many Requests', {'error':'Daily wavelength-query limit reached.'}, extra=[('Retry-After','86400')])
                return response('200 OK', result)
        except (QueryError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            message = str(exc) if isinstance(exc, QueryError) else 'The requested query is unavailable.'
            return response('400 Bad Request', {'error':message})
        except Exception:
            return response('503 Service Unavailable', {'error':'This view is temporarily unavailable.'})
        return response('404 Not Found', {'error':'This resource is unavailable.'})

def from_environment():
    if os.environ.get('MIRROR_PUBLIC_ORIGIN'):
        webroot = os.environ.get('MIRROR_WEB_ROOT')
        if not webroot:
            raise ValueError('Production requires an explicit public web-root path.')
        data_root = Path(os.environ['MIRROR_DATA_ROOT']).resolve()
        if data_root == Path(webroot).resolve() or data_root.is_relative_to(Path(webroot).resolve()):
            raise ValueError('The dataset must be outside the public web root.')
    return App(os.environ['MIRROR_DATA_ROOT'], os.environ['MIRROR_QUOTA_DB'],
               origin=os.environ.get('MIRROR_PUBLIC_ORIGIN'), trust_proxy=os.environ.get('MIRROR_TRUST_PROXY')=='1',
               plot_limit=int(os.environ.get('MIRROR_PLOTS_PER_DAY','120')),
               probe_limit=int(os.environ.get('MIRROR_PROBES_PER_DAY','40')),
               global_limit=int(os.environ.get('MIRROR_REQUESTS_PER_DAY','2400')))

if __name__ == '__main__':
    from wsgiref.simple_server import make_server
    with make_server('localhost', int(os.environ.get('PORT','8765')), from_environment()) as httpd:
        print('Local API: http://localhost:'+str(httpd.server_port)+PREFIX+'/api/materials', flush=True)
        httpd.serve_forever()
