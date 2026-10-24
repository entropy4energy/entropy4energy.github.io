import io
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from server import App, Store, Quotas, from_environment

class AccessTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1])
        self.root=Path(self.tmp.name)
        (self.root/'data/spectra').mkdir(parents=True)
        cols=['wavelength_nm','n_mode1','k_mode1','R_unpolarized_percent','finite_epsilon','passive_epsilon','valid_normal_z']
        rows=[[200,1,0.1,10,True,True,True],[400,2,0.2,20,True,True,True],
              [500,3,0.3,30,True,False,False],[600,4,0.4,40,True,True,True],
              [800,5,0.5,50,True,True,True],[1200,6,0.6,60,True,True,True]]
        (self.root/'data/spectra/test.json').write_text(json.dumps({'columns':cols,'rows':rows}))
        run={'metadata':{'formula':'Test','source_structure_id':'external-structure-marker','ENCUT_eV':520,'source_path':'private/secret','vasprun_xml':'private/raw.xml'},
             'channels':{c:{'screening':{'url':'data/spectra/test.json'}} for c in ['density','current']}}
        comparisons={}
        for mid,delta in [('Second',1),('Third',2)]:
            adjusted=[row[:1]+[row[1]+delta,row[2]+delta,row[3]+10*delta]+row[4:] for row in rows]
            (self.root/('data/spectra/'+mid+'.json')).write_text(json.dumps({'columns':cols,'rows':adjusted}))
            other=json.loads(json.dumps(run))
            for response in other['channels'].values():
                response['screening']['url']='data/spectra/'+mid+'.json'
            comparisons[mid]=other
        cat={'families':{'test':'Synthetic tests'},'materials':[{'id':'Test','family':'test','excluded':False,'runs':{'PBE':run,'GW':run}},
             {'id':'Second','family':'test','excluded':False,'runs':{'PBE':comparisons['Second'],'GW':comparisons['Second']}},
             {'id':'Third','family':'test','excluded':False,'runs':{'PBE':comparisons['Third']}},
             {'id':'Excluded','family':'test','excluded':True,'runs':{'PBE':run}}]}
        (self.root/'data/catalog.json').write_text(json.dumps(cat))
        self.app=App(self.root,self.root/'quota.sqlite3',origin='https://example.org',probe_limit=2,plot_limit=2)
        self.q={'material':'Test','branch':'PBE','channel':'density','band':'all','wavelength':'400'}

    def tearDown(self):self.tmp.cleanup()

    def request(self,path,method='GET',body=None,ip='test',origin='https://example.org',query='',forwarded=None):
        raw=json.dumps(body).encode() if body is not None else b''
        env={'PATH_INFO':'/fusion-mirrors'+path,'REQUEST_METHOD':method,'REMOTE_ADDR':ip,
             'CONTENT_LENGTH':str(len(raw)),'CONTENT_TYPE':'application/json','HTTP_ORIGIN':origin,
             'QUERY_STRING':query,'wsgi.input':io.BytesIO(raw)}
        if forwarded is not None:env['HTTP_X_REAL_IP']=forwarded
        result={}
        response=b''.join(self.app(env,lambda status,headers:result.update(status=status,headers=dict(headers))))
        return result,response

    def test_exact_value_and_no_array(self):
        status,raw=self.request('/api/probe','POST',self.q)
        self.assertEqual(status['status'],'200 OK')
        d=json.loads(raw);self.assertEqual(d['values'][0]['R'],20)
        self.assertNotIn('rows',d);self.assertEqual(len(d['values']),1)

    def test_invalid_value_stays_missing(self):
        _,raw=self.request('/api/probe','POST',{**self.q,'wavelength':'500'})
        value=json.loads(raw)['values'][0]
        self.assertIsNone(value['R']);self.assertIsNone(value['n'])

    def test_no_extrapolation(self):
        s,_=self.request('/api/probe','POST',{**self.q,'wavelength':'1300'})
        self.assertEqual(s['status'],'400 Bad Request')

    def test_no_batch_probe(self):
        for payload in [[self.q],{**self.q,'wavelength':['400','600']},{**self.q,'materials':'Test,Other'}]:
            s,_=self.request('/api/probe','POST',payload)
            self.assertEqual(s['status'],'400 Bad Request')

    def test_unknown_routes_never_serve_files(self):
        for p in ['/data/catalog.json','/../data/catalog.json','/api/download','/assets/../server.py','/server.py']:
            s,_=self.request(p)
            self.assertEqual(s['status'],'404 Not Found')

    def test_catalog_and_provenance_are_sanitized(self):
        _,raw=self.request('/api/materials')
        self.assertNotIn(b'Excluded',raw);self.assertNotIn(b'private/',raw)
        _,raw=self.request('/api/provenance',query='material=Test')
        self.assertNotIn(b'private/',raw);self.assertNotIn(b'vasprun',raw)
        self.assertNotIn(b'source_path',raw)
        self.assertNotIn(b'source_structure_id',raw)
        self.assertNotIn(b'external-structure-marker',raw)
        self.assertEqual(json.loads(raw)['calculations'][0]['settings']['ENCUT_eV'],520)

    def test_bounded_material_comparison_uses_one_wavelength(self):
        query={**self.q,'compare':'Second,Third'}
        status,raw=self.request('/api/probe','POST',query)
        self.assertEqual(status['status'],'200 OK')
        values=json.loads(raw)['values']
        self.assertEqual([v['material'] for v in values],['Test','Second','Third'])
        self.assertEqual([v['sample_nm'] for v in values],[400,400,400])
        self.assertEqual([v['R'] for v in values],[20,30,40])
        self.assertNotIn(b'rows',raw)
        status,raw=self.request('/api/provenance',query='material=Test&compare=Second,Third')
        self.assertEqual(status['status'],'200 OK')
        self.assertEqual(len(json.loads(raw)['calculations']),3)
        self.assertNotIn(b'external-structure-marker',raw)
        status,raw=self.request('/api/plot',query='material=Test&compare=Second,Third&quantity=all')
        self.assertEqual(status['status'],'200 OK')
        self.assertTrue(raw.startswith(b'\x89PNG'))

    def test_comparison_rejects_duplicates_excess_unavailable_and_mixed_paw(self):
        for compared,branch in [('Test','PBE'),('Second,Second','PBE'),('Second,Third,Other','PBE'),
                                ('Excluded','PBE'),('Missing','PBE'),('Third','GW'),('Second','both')]:
            status,_=self.request('/api/probe','POST',{**self.q,'compare':compared,'branch':branch})
            self.assertEqual(status['status'],'400 Bad Request',(compared,branch))

    def test_comparison_queries_keep_the_same_daily_quota(self):
        for _ in range(2):
            status,_=self.request('/api/probe','POST',{**self.q,'compare':'Second,Third'})
            self.assertEqual(status['status'],'200 OK')
        status,_=self.request('/api/probe','POST',self.q)
        self.assertEqual(status['status'],'429 Too Many Requests')

    def test_plot_geometry_is_public_but_spectra_are_not(self):
        status,raw=self.request('/api/materials')
        data=json.loads(raw)
        self.assertEqual([p['field'] for p in data['plot_layouts']['all']['panels']],['R','n','k'])
        self.assertEqual(data['plot_layouts']['R']['height'],430)
        self.assertEqual(data['bands']['visible'],[400,700])
        for key in [b'rows',b'wavelength_nm',b'external-structure-marker',b'source_structure_id']:
            self.assertNotIn(key,raw)

    def test_cross_origin_rejected(self):
        s,_=self.request('/api/probe','POST',self.q,origin='https://other.example')
        self.assertEqual(s['status'],'403 Forbidden')

    def test_rate_limit_is_persistent_across_instances(self):
        for _ in range(2):self.request('/api/probe','POST',self.q)
        self.app=App(self.root,self.root/'quota.sqlite3',origin='https://example.org',probe_limit=2)
        s,_=self.request('/api/probe','POST',self.q)
        self.assertEqual(s['status'],'429 Too Many Requests')
        self.assertEqual(s['headers']['Retry-After'],'86400')

    def test_forwarded_ip_spoof_is_ignored_by_default(self):
        for i in range(2):self.request('/api/probe','POST',self.q,forwarded=str(i))
        s,_=self.request('/api/probe','POST',self.q,forwarded='new-address')
        self.assertEqual(s['status'],'429 Too Many Requests')

    def test_plot_is_raster_without_rows(self):
        s,raw=self.request('/api/plot',query='material=Test')
        self.assertEqual(s['headers']['Content-Type'],'image/png')
        self.assertTrue(raw.startswith(b'\x89PNG'))
        self.assertNotIn(b'wavelength_nm',raw)

    def test_reflectivity_plot_and_optical_constants_remain_available(self):
        from PIL import Image
        for quantity,height in [('R',430),('all',720)]:
            status,raw=self.request('/api/plot',query='material=Test&quantity='+quantity)
            self.assertEqual(status['status'],'200 OK')
            self.assertEqual(Image.open(io.BytesIO(raw)).size,(1040,height))
            self.assertNotIn(b'wavelength_nm',raw)
        status,_=self.request('/api/plot',query='material=Test&quantity=rows',ip='other')
        self.assertEqual(status['status'],'400 Bad Request')

    def test_spectral_regions_keep_their_colors(self):
        from PIL import Image
        image=Image.open(io.BytesIO(self.app.store.plot({**self.q,'quantity':'R'})))
        for point,color in [((180,210),(221,204,244)),((450,210),(190,231,201)),((800,210),(194,220,245))]:
            self.assertEqual(image.getpixel(point),color)

    def test_plot_formula_digits_use_a_lower_baseline(self):
        from PIL import Image,ImageDraw,ImageFont
        from server import draw_formula,HERE
        font=ImageFont.truetype(str(HERE/'fonts/WorkSans-Regular.ttf'),23)
        small=ImageFont.truetype(str(HERE/'fonts/WorkSans-Regular.ttf'),14)
        draw=ImageDraw.Draw(Image.new('RGB',(200,60),'white'))
        with patch.object(draw,'text',wraps=draw.text) as text:
            draw_formula(draw,(0,0),'Al2O3',font,small,'black')
        regular=[c.args[0][1] for c in text.call_args_list if not c.args[1].isdigit()]
        digits=[c for c in text.call_args_list if c.args[1].isdigit()]
        self.assertEqual([c.args[1] for c in digits],['2','3'])
        self.assertTrue(all(c.args[0][1]>max(regular) for c in digits))
        self.assertTrue(all(c.kwargs['font'] is small for c in digits))

    def test_duplicate_query_values_rejected(self):
        s,_=self.request('/api/plot',query='material=Test&material=Other')
        self.assertEqual(s['status'],'400 Bad Request')

    def test_no_path_escape_from_catalog(self):
        self.app.store.materials['Test']['runs']['PBE']['channels']['density']['screening']['url']='data/spectra/../../../secret'
        s,_=self.request('/api/probe','POST',self.q)
        self.assertEqual(s['status'],'400 Bad Request')

    def test_concurrent_quota_is_atomic(self):
        q=Quotas(self.root/'concurrent.sqlite3',probe_limit=3)
        with ThreadPoolExecutor(max_workers=8) as pool:
            results=list(pool.map(lambda _:q.consume('one-visitor','probe'),range(12)))
        self.assertEqual(sum(results),3)

    def test_daily_quota_rollover(self):
        q=Quotas(self.root/'rollover.sqlite3',probe_limit=1)
        self.assertTrue(q.consume('visitor','probe',now=100))
        self.assertFalse(q.consume('visitor','probe',now=200))
        self.assertTrue(q.consume('visitor','probe',now=86500))
        with sqlite3.connect(q.path) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM quotas').fetchone()[0],1)

    def test_production_rejects_public_data_directory(self):
        settings={'MIRROR_DATA_ROOT':str(self.root),'MIRROR_QUOTA_DB':str(self.root/'prod.sqlite3'),
                  'MIRROR_PUBLIC_ORIGIN':'https://example.org','MIRROR_WEB_ROOT':str(self.root)}
        with patch.dict(os.environ,settings):
            with self.assertRaisesRegex(ValueError,'outside the public web root'):
                from_environment()

    def test_untrusted_peer_cannot_supply_real_ip(self):
        self.app.trust_proxy=True
        for i in range(2):self.request('/api/probe','POST',self.q,forwarded=str(i))
        s,_=self.request('/api/probe','POST',self.q,forwarded='another')
        self.assertEqual(s['status'],'429 Too Many Requests')

    def test_query_band_limits(self):
        s,_=self.request('/api/probe','POST',{**self.q,'band':'visible','wavelength':'1064'})
        self.assertEqual(s['status'],'400 Bad Request')

if __name__=='__main__':unittest.main()
