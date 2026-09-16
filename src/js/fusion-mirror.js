(() => {
'use strict';
// Code-only explorer. Read File objects locally; never fetch or upload DFT data.
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const names={Ag:'Silver',Al:'Aluminium',Au:'Gold',Bi:'Bismuth',Co:'Cobalt',Cr:'Chromium',Cu:'Copper',Fe:'Iron',Ge:'Germanium',Hf:'Hafnium',In:'Indium',Ir:'Iridium',K:'Potassium',Li:'Lithium',Lu:'Lutetium',Mg:'Magnesium',Mo:'Molybdenum',Na:'Sodium',Nb:'Niobium',Ni:'Nickel',Os:'Osmium',P:'Phosphorus',Pb:'Lead',Pd:'Palladium',Pt:'Platinum',Re:'Rhenium',Rh:'Rhodium',Ru:'Ruthenium',Si:'Silicon',Ta:'Tantalum',Ti:'Titanium',V:'Vanadium',W:'Tungsten',Zn:'Zinc',Zr:'Zirconium',SiO2:'Silicon dioxide',Al2O3:'Aluminium oxide',MgScAlO4:'Magnesium scandium aluminium oxide'};
const labels={PBE:'Standard PAW / PBE',GW:'GW-oriented PAW / PBE'};
const colors={PBE:'#002D72',GW:'#b85c00'};
const modeLabels={mode1:'Normal-z mode 1',mode2:'Normal-z mode 2',x:'Cartesian x diagonal diagnostic',y:'Cartesian y diagonal diagnostic',z:'Cartesian z diagonal diagnostic'};
const presets={all:[200,1200],uv:[200,400],visible:[400,700],nir:[700,1200]};
let catalog, selected, loaded=[], generation=0, tableLimit=80, activeRange='all';
let state={material:'Ag',branch:'PBE',channel:'density',component:'mode1',polarization:'unpolarized',sampling:'screening',min:200,max:1200,log:false};
const cache=new Map();
let localFiles=new Map(), importGeneration=0;
const appRoot=document.getElementById('fusion-mirror-app');
const number=(x,d=4)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const plain=(x,d=6)=>Number.isFinite(x)?Number(x.toPrecision(d)).toString():'';
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function option(value,text){const e=document.createElement('option');e.value=value;e.textContent=text;return e;}
function svgEl(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function formatFormula(s){return s.replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).toLowerCase().replace(/[^a-z0-9]/g,'');}
function updateMaterialList(prefer=state.material){
  const q=formatFormula($('search').value),family=$('family').value;
  const matches=catalog.materials.filter(m=>($('include-excluded').checked||!m.excluded)&&(family==='all'||m.family===family)&&(!q||formatFormula(m.id).includes(q)||formatFormula(names[m.id]||'').includes(q)||formatFormula(m.runs.PBE?.metadata.formula||'').includes(q)));
  $('material').replaceChildren(...matches.map(m=>option(m.id,`${m.id}${names[m.id]?' · '+names[m.id]:''}${m.excluded?' [excluded]':''}`)));
  $('material-count').textContent=`(${matches.length})`;
  if(!matches.length){$('material').disabled=true;status('No materials match this search. The previous selection remains displayed.');return;}
  $('material').disabled=false;$('material').value=matches.some(m=>m.id===prefer)?prefer:matches[0].id;
  selectMaterial();
}
function selectMaterial(){
  state.material=$('material').value;
  selected=catalog.materials.find(m=>m.id===state.material);
  for(const o of $('branch').options)o.disabled=o.value==='both'?Object.keys(selected.runs).length<2:!selected.runs[o.value];
  if($('branch').selectedOptions[0].disabled){$('branch').value=selected.runs.PBE?'PBE':'GW';state.branch=$('branch').value;}
  $('family-title').textContent=catalog.families[selected.family];
  $('material-title').replaceChildren(document.createTextNode(names[selected.id]||selected.id));
  if(names[selected.id]){const span=document.createElement('span');span.textContent=selected.id;$('material-title').append(span);}
  refresh();
}
function branches(){return state.branch==='both'?['PBE','GW'].filter(b=>selected.runs[b]):[state.branch];}
function viewMetadata(){return {website_version:'s4e-local-review-1',material:state.material,family:selected.family,
  method:'VASP independent-particle PBE; GW label denotes PAW choice, not quasiparticle GW',
  channel:state.channel,branches:branches(),sampling:state.sampling,wavelength_range_nm:[state.min,state.max],
  optical_index:modeLabels[state.component],reflectivity_polarization:state.polarization,
  angle_degrees:0,surface_normal:'Cartesian z',geometry:'Air / semi-infinite material',
  scale:state.log?'logarithmic wavelength':'linear wavelength',
  validity:'Only finite, passive n/k and valid full-tensor reflected powers are plotted. No extrapolation or averaging.',
  source_manifest_sha256:catalog.manifest_sha256,
  sources:branches().map(b=>({branch:b,calculation:selected.runs[b].metadata,
    csv_sources:selected.runs[b].channels[state.channel][state.sampling].sources}))};}
// Do not place private selections in URLs, browser history or analytics.
function updateURL(){}
function syncRange(){
  $('min-wl').value=state.min;$('max-wl').value=state.max;$('sampling').value=state.sampling;$('log-axis').checked=state.log;
  for(const b of appRoot.querySelectorAll('[data-range]')){b.classList.toggle('selected',b.dataset.range===activeRange);b.setAttribute('aria-pressed',String(b.dataset.range===activeRange));}
}
function setBusy(busy){for(const id of ['download-csv','download-view','more-rows'])$(id).disabled=busy;for(const b of appRoot.querySelectorAll('[data-download]'))b.disabled=busy;}
function localFile(path){
  if(typeof path!=='string'||!path.startsWith('data/')||path.split('/').some(p=>p==='..'||p==='.')||path.includes('\\'))
    throw new Error('Invalid local data path');
  const file=localFiles.get(path);
  if(!file)throw new Error('A required file is missing from the selected data folder: '+path);
  return file;
}
async function readJSON(file){
  if(file.size>50*1024*1024)throw new Error('JSON exceeds the 50 MB safety limit');
  return JSON.parse(await file.text());
}
function validateSpectrum(data){
  const required=['wavelength_nm','energy_eV','n_mode1','k_mode1','n_mode2','k_mode2',
    'n_x','k_x','n_y','k_y','n_z','k_z','R_unpolarized_percent','R_x_percent','R_y_percent',
    'finite_epsilon','passive_epsilon','rounding_uncertain_absorption','valid_normal_z'];
  if(!Array.isArray(data.columns)||new Set(data.columns).size!==data.columns.length||
    required.some(k=>!data.columns.includes(k))||!Array.isArray(data.rows)||data.rows.length>10000)
    throw new Error('Unsupported spectrum schema');
  let last=0;const wi=data.columns.indexOf('wavelength_nm');
  for(const row of data.rows){
    if(!Array.isArray(row)||row.length!==data.columns.length||!Number.isFinite(row[wi])||row[wi]<=last)
      throw new Error('Wavelengths must be positive, finite and strictly increasing');
    last=row[wi];
  }
  return data;
}
async function getData(url){
  if(cache.has(url))return cache.get(url);
  const epoch=importGeneration, data=validateSpectrum(await readJSON(localFile(url)));
  if(epoch===importGeneration){cache.set(url,data);if(cache.size>16)cache.delete(cache.keys().next().value);}
  return data;
}
async function refresh(){
  const token=++generation;document.body.dataset.ready='loading';setBusy(true);status(`Loading ${state.material} · ${state.channel} response…`);
  try{
    if(activeRange==='full'){
      state.sampling='native';const ranges=branches().map(b=>selected.runs[b].channels[state.channel].native.range_nm).filter(Boolean);
      if(ranges.length){state.min=Math.min(...ranges.map(r=>r[0]));state.max=Math.max(...ranges.map(r=>r[1]));state.log=state.max/state.min>30;}
      syncRange();
    }
    const datasets=await Promise.all(branches().map(async branch=>({branch,data:await getData(selected.runs[branch].channels[state.channel][state.sampling].url)})));
    if(token!==generation)return;
    loaded=datasets.map(d=>({...d,index:Object.fromEntries(d.data.columns.map((c,i)=>[c,i]))}));
    tableLimit=80;render();updateURL();setBusy(false);
    status(`${selected.id} loaded · ${labels[state.branch]||'two PAW datasets, both PBE'} · ${state.sampling==='native'?'native energy sampling':'1 nm screening grid'}${selected.excluded?' · excluded from the fusion-feasible screening':''}`);
    document.body.dataset.ready='true';
  }catch(error){if(token!==generation)return;loaded=[];document.body.dataset.ready='error';status(`${error.message}. Select a complete explorer data folder or another available response.`,true);renderEmpty();}
}
function pick(d,row,kind){
  const i=d.index;
  if(kind==='R'){const key=state.polarization==='unpolarized'?'R_unpolarized_percent':`R_${state.polarization}_percent`;return row[i.valid_normal_z]===true&&Number.isFinite(row[i[key]])?row[i[key]]:null;}
  const key=`${kind}_${state.component}`;
  return row[i.finite_epsilon]===true&&row[i.passive_epsilon]===true&&Number.isFinite(row[i[key]])?row[i[key]]:null;
}
function windowRows(d){return d.data.rows.filter(r=>r[d.index.wavelength_nm]>=state.min&&r[d.index.wavelength_nm]<=state.max);}
function plottedRows(){return loaded.flatMap(d=>windowRows(d).map(r=>({material:state.material,family:selected.family,
  branch:d.branch,method:'PBE',channel:state.channel,sampling:state.sampling,optical_index:state.component,
  reflectivity_polarization:state.polarization,wavelength_nm:r[d.index.wavelength_nm],energy_eV:r[d.index.energy_eV],
  n:pick(d,r,'n'),k:pick(d,r,'k'),R_percent:pick(d,r,'R'),finite_epsilon:r[d.index.finite_epsilon],
  passive_epsilon:r[d.index.passive_epsilon],rounding_uncertain_absorption:r[d.index.rounding_uncertain_absorption],
  valid_normal_z:r[d.index.valid_normal_z]})));}
function renderEmpty(){for(const k of ['n','k','R'])$(`chart-${k}`).replaceChildren();for(const id of ['data-table','probe-result','provenance','legend','table-count'])$(id).replaceChildren();$('points-value').textContent='—';$('support-value').textContent='—';}
function render(){
  $('selection-detail').textContent=`${state.channel==='density'?'Density–density':'Current–current'} response · ${modeLabels[state.component]} · ${state.polarization==='unpolarized'?'unpolarized reflection':`reflection for incident E along ${state.polarization}`}`;
  $('range-value').textContent=`${number(state.min,2)}–${number(state.max,2)} nm`;
  const spans=branches().map(b=>selected.runs[b].channels[state.channel].native.range_nm).filter(Boolean);
  $('support-value').textContent=spans.length?`${number(Math.min(...spans.map(r=>r[0])),2)}–${number(Math.max(...spans.map(r=>r[1])),2)} nm`:'No valid samples';
  const points=loaded.reduce((n,d)=>n+windowRows(d).length,0);
  const hidden=loaded.reduce((n,d)=>n+windowRows(d).filter(r=>pick(d,r,'n')===null||pick(d,r,'k')===null||pick(d,r,'R')===null).length,0);
  $('points-value').textContent=`${number(points,0)}${loaded.length>1?' across both datasets':''}`;
  $('quality-note').textContent=`*Native span${loaded.length>1?' is the union of selected datasets':''}; internal gaps may exist. ${hidden} selected row(s) have at least one unavailable plotted value. ${'xyz'.includes(state.component)?'Cartesian n/k are diagonal diagnostics; reflectivity still uses the full tensor. ':''}${selected.excluded?'This composition is excluded from the fusion-feasible screen. ':''}${state.material==='C_graphene'?'The archived family assignment is retained; a bulk half-space model of a periodic graphene cell is not an isolated-sheet optical model. ':''}No spectral averaging or extrapolation is used.`;
  $('legend').replaceChildren(...loaded.map(d=>{const e=document.createElement('span');e.className='legend-item';const line=document.createElement('span');line.className='legend-line'+(d.branch==='GW'?' gw':'');line.setAttribute('aria-hidden','true');e.append(line,document.createTextNode(labels[d.branch]));return e;}));
  for(const k of ['n','k','R'])drawChart(k);
  renderTable();renderProvenance();renderProbe();
}
function ticks(lo,hi,count=5){
  if(!(hi>lo))return [lo];const raw=(hi-lo)/count,p=10**Math.floor(Math.log10(raw)),a=raw/p;
  const step=(a<=1?1:a<=2?2:a<=2.5?2.5:a<=5?5:10)*p;const out=[];
  for(let v=Math.ceil(lo/step)*step;v<=hi+step*1e-8;v+=step)out.push(Number(v.toPrecision(12)));
  return out;
}
function drawChart(kind){
  const wide=kind==='R',W=wide?1040:520,H=wide?320:315,L=59,T=84,B=54,R=18,PW=W-L-R,PH=H-T-B;
  const root=svgEl('svg',{xmlns:NS,viewBox:`0 0 ${W} ${H}`,width:W,height:H,role:'img',tabindex:'0','aria-label':`${state.material}, ${kind==='R'?'Air/material reflectivity in percent':kind+' optical constant'}, wavelength ${state.min} to ${state.max} nm. Data table below.`});
  root.append(svgEl('title',{},`${state.material} — ${kind==='R'?'Air/material reflectivity (%)':kind}`),svgEl('desc',{},JSON.stringify(viewMetadata())),svgEl('rect',{width:W,height:H,fill:'#fff'}));
  const title=`${state.material} · ${kind==='R'?`R (%) · ${state.polarization} · normal z`:kind+' · '+modeLabels[state.component]}`;
  root.append(svgEl('text',{x:L,y:20,fill:'#193340','font-family':'Arial,sans-serif','font-size':12,'font-weight':600},title));
  root.append(svgEl('text',{x:L,y:38,fill:'#536b77','font-family':'Arial,sans-serif','font-size':10},`${state.channel} · ${state.sampling} · PBE electronic structure`));
  loaded.forEach((d,j)=>{const lx=L+j*175;root.append(svgEl('line',{x1:lx,x2:lx+24,y1:55,y2:55,stroke:colors[d.branch],'stroke-width':2.3,'stroke-dasharray':d.branch==='GW'?'7 4':'none'}));root.append(svgEl('text',{x:lx+30,y:59,fill:'#536b77','font-family':'Arial,sans-serif','font-size':10},d.branch==='PBE'?'Standard PAW':'GW-oriented PAW'));});
  const values=loaded.flatMap(d=>windowRows(d).map(r=>pick(d,r,kind)).filter(v=>v!==null));
  let ymax=kind==='R'?100:Math.max(1e-8,values.length?Math.max(...values):1)*1.08,ymin=0;
  if(kind!=='R'&&values.length)ymin=Math.min(0,Math.min(...values)*1.08);
  const x=v=>L+(state.log?(Math.log(v)-Math.log(state.min))/(Math.log(state.max)-Math.log(state.min)):(v-state.min)/(state.max-state.min))*PW;
  const y=v=>T+PH-(v-ymin)/(ymax-ymin)*PH;
  for(const[name,lo,hi,fill]of [['UV',200,400,'#eeebf8'],['Visible',400,700,'#e8f3ec'],['Near-IR',700,1200,'#faf0e4']]){
    const a=Math.max(state.min,lo),b=Math.min(state.max,hi);if(b>a){root.append(svgEl('rect',{x:x(a),y:T,width:x(b)-x(a),height:PH,fill,opacity:.7}));if(x(b)-x(a)>35)root.append(svgEl('text',{x:(x(a)+x(b))/2,y:T-7,'text-anchor':'middle',fill:'#60727d','font-family':'Arial,sans-serif','font-size':9},name));}
  }
  let xt=ticks(state.min,state.max,wide?9:5);
  if(state.log){xt=[];for(let e=Math.floor(Math.log10(state.min));e<=Math.ceil(Math.log10(state.max));e++)for(const m of [1,2,5]){const v=m*10**e;if(v>=state.min&&v<=state.max)xt.push(v);}if(xt.length>10)xt=xt.filter((_,i)=>i%2===0);}
  for(const t of xt){root.append(svgEl('line',{x1:x(t),x2:x(t),y1:T,y2:T+PH,stroke:'#dfe7e9','stroke-width':.7}));root.append(svgEl('text',{x:x(t),y:T+PH+20,'text-anchor':'middle',fill:'#536b77','font-family':'Arial,sans-serif','font-size':11},Math.abs(t)>=100000?t.toExponential(0):number(t,3)));}
  for(const t of ticks(ymin,ymax,5)){root.append(svgEl('line',{x1:L,x2:L+PW,y1:y(t),y2:y(t),stroke:'#dfe7e9','stroke-width':.7}));root.append(svgEl('text',{x:L-9,y:y(t)+4,'text-anchor':'end',fill:'#536b77','font-family':'Arial,sans-serif','font-size':11},Math.abs(t)<.001&&t!==0?t.toExponential(1):number(t,3)));}
  root.append(svgEl('path',{d:`M${L},${T}V${T+PH}H${L+PW}`,fill:'none',stroke:'#a9b9c0','stroke-width':1}));
  const defs=svgEl('defs'),clip=svgEl('clipPath',{id:`clip-${kind}`});clip.append(svgEl('rect',{x:L,y:T,width:PW,height:PH}));defs.append(clip);root.append(defs);
  for(const d of loaded){let path='',pen=false;const rs=windowRows(d);for(const row of rs){const v=pick(d,row,kind);if(v===null){pen=false;continue;}path+=`${pen?'L':'M'}${x(row[d.index.wavelength_nm]).toFixed(3)},${y(v).toFixed(3)} `;pen=true;}
    root.append(svgEl('path',{d:path,fill:'none',stroke:colors[d.branch],'stroke-width':2.3,'stroke-linejoin':'round','stroke-linecap':'round','stroke-dasharray':d.branch==='GW'?'7 4':'none','clip-path':`url(#clip-${kind})`,'data-series':d.branch}));
    const vs=rs.filter(r=>pick(d,r,kind)!==null);if(vs.length===1)root.append(svgEl('circle',{cx:x(vs[0][d.index.wavelength_nm]),cy:y(pick(d,vs[0],kind)),r:3,fill:colors[d.branch]}));
  }
  if(!values.length)root.append(svgEl('text',{x:L+PW/2,y:T+PH/2,'text-anchor':'middle',fill:'#536b77','font-family':'Arial,sans-serif','font-size':13},'No valid data in this wavelength window'));
  root.append(svgEl('text',{x:L+PW/2,y:H-11,'text-anchor':'middle',fill:'#193340','font-family':'Arial,sans-serif','font-size':12},`Wavelength (nm)${state.log?' · logarithmic':''}`));
  root.append(svgEl('text',{transform:`translate(15 ${T+PH/2}) rotate(-90)`,'text-anchor':'middle',fill:'#193340','font-family':'Arial,sans-serif','font-size':12},kind==='R'?'Reflectivity (%)':`${kind} (dimensionless)`));
  root.addEventListener('pointermove',e=>{
    const box=root.getBoundingClientRect(),sx=(e.clientX-box.left)*W/box.width;
    if(sx<L||sx>L+PW){$('tooltip').hidden=true;return;}
    const f=(sx-L)/PW,target=state.log?Math.exp(Math.log(state.min)+f*(Math.log(state.max)-Math.log(state.min))):state.min+f*(state.max-state.min);
    let message=`${state.material} · nearest sampled values`;
    for(const d of loaded){const rs=windowRows(d);if(!rs.length){message+=`\n${d.branch}: no samples`;continue;}let nearest=rs[0];for(const row of rs)if(Math.abs(row[d.index.wavelength_nm]-target)<Math.abs(nearest[d.index.wavelength_nm]-target))nearest=row;
      message+=`\n${d.branch==='PBE'?'Standard':'GW-oriented'}: ${number(nearest[d.index.wavelength_nm],3)} nm → ${number(pick(d,nearest,kind),5)}${kind==='R'?' %':''}`;
    }
    const t=$('tooltip');t.textContent=message;t.hidden=false;t.style.left=Math.max(6,Math.min(e.clientX+14,innerWidth-290))+'px';t.style.top=Math.max(6,Math.min(e.clientY+14,innerHeight-100))+'px';
  });
  root.addEventListener('pointerleave',()=>{$('tooltip').hidden=true;});
  $(`chart-${kind}`).replaceChildren(root);
}
function renderTable(){
  const all=plottedRows(),show=all.slice(0,tableLimit);$('data-table').replaceChildren(...show.map(r=>{const tr=document.createElement('tr');
    const valid=r.n!==null&&r.k!==null&&r.R_percent!==null;
    for(const v of [r.branch==='PBE'?'Standard':'GW-oriented',number(r.wavelength_nm,6),number(r.n,6),number(r.k,6),number(r.R_percent,6),valid?'Valid':'Gap / unavailable']){const td=document.createElement('td');td.textContent=v;tr.append(td);}return tr;}));
  if(!all.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No sampled rows in this range. Choose another range or sampling grid.';tr.append(td);$('data-table').append(tr);}
  $('table-count').textContent=`Showing ${show.length} of ${number(all.length,0)} rows. The CSV download includes all selected rows, not just this preview.`;
  $('more-rows').hidden=show.length>=all.length;
}
function renderProvenance(){
  $('provenance').replaceChildren(...loaded.map(d=>{
    const run=selected.runs[d.branch],meta=run.metadata,details=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent=`${selected.id} · ${labels[d.branch]} — calculation details & source downloads`;details.append(summary);
    const dl=document.createElement('dl');for(const[k,v]of Object.entries({'Method':meta.method,'PAW labels':meta.PAW_labels,'Energy cutoff':meta.ENCUT_eV+' eV','Optical broadening CSHIFT':meta.CSHIFT_eV+' eV','Bands (effective)':meta.NBANDS_effective,'Electronic convergence':meta.electronic_converged,'Normal termination':meta.normal_termination,'VASP XML SHA-256':meta.vasprun_original_sha256})){
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=String(v);dl.append(dt,dd);
    }details.append(dl);
    for(const scope of ['native','screening']){const div=document.createElement('div');div.className='source-links';for(const source of run.channels[state.channel][scope].sources){const a=document.createElement('button');a.type='button';a.addEventListener('click',()=>{try{saveBlob(localFile(source.download),source.download.split('/').pop());}catch(error){status(error.message,true);}});a.textContent=`${scope==='native'?'Full native':'Screening'} ${source.kind==='optical-constants'?'optical constants':'reflectivity'} (.csv.gz) ↓`;div.append(a);}details.append(div);}
    return details;
  }));
}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function fileStem(){return `${state.material}_${state.branch}_${state.channel}_${state.sampling}_${plain(state.min)}-${plain(state.max)}nm_${state.component}_${state.polarization}`;}
function csvCell(v){if(v===null||v===undefined)return '';const raw=String(v),s=typeof v==='string'&&/^[=+@\-]/.test(raw)?"'"+raw:raw;return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
function downloadCSV(){const rows=plottedRows(),keys=['material','family','branch','method','channel','sampling','optical_index','reflectivity_polarization','wavelength_nm','energy_eV','n','k','R_percent','finite_epsilon','passive_epsilon','rounding_uncertain_absorption','valid_normal_z'];const text=keys.join(',')+'\r\n'+rows.map(r=>keys.map(k=>csvCell(r[k])).join(',')).join('\r\n')+'\r\n';saveBlob(new Blob([text],{type:'text/csv;charset=utf-8'}),fileStem()+'.csv');}
async function downloadFigure(kind,format){
  const original=$(`chart-${kind}`).querySelector('svg');if(!original)return;
  const node=original.cloneNode(true);node.removeAttribute('tabindex');
  const meta=svgEl('metadata',{},JSON.stringify(viewMetadata()));node.prepend(meta);
  const text=new XMLSerializer().serializeToString(node),blob=new Blob([text],{type:'image/svg+xml;charset=utf-8'});
  if(format==='svg'){saveBlob(blob,`${fileStem()}_${kind}.svg`);return;}
  const url=URL.createObjectURL(blob),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    const canvas=document.createElement('canvas');canvas.width=Number(node.getAttribute('width'))*3;canvas.height=Number(node.getAttribute('height'))*3;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('PNG export failed');saveBlob(png,`${fileStem()}_${kind}.png`);
  }catch(error){status('Could not export PNG. Please use SVG or try another browser.',true);}finally{URL.revokeObjectURL(url);}
}
function resetState(){
  state={material:catalog.materials.some(m=>m.id==='Ag')?'Ag':catalog.materials[0].id,
    branch:'PBE',channel:'density',component:'mode1',polarization:'unpolarized',
    sampling:'screening',min:200,max:1200,log:false};
  activeRange='all';$('search').value='';$('include-excluded').checked=false;
  for(const k of ['branch','channel','component','polarization','sampling'])$(k).value=state[k];
  syncRange();
}
function renderProbe(){
  const target=Number($('probe-wl').value),out=$('probe-result');out.replaceChildren();
  if(!(Number.isFinite(target)&&target>0)){out.textContent='Enter a positive wavelength.';return;}
  for(const d of loaded){
    const p=document.createElement('p'),rows=windowRows(d),wi=d.index.wavelength_nm;
    if(!rows.length||target<rows[0][wi]||target>rows.at(-1)[wi]){
      p.textContent=labels[d.branch]+': requested wavelength is outside the sampled window. No extrapolation.';
    }else{
      let nearest=rows[0];for(const row of rows)if(Math.abs(row[wi]-target)<Math.abs(nearest[wi]-target))nearest=row;
      const values=['n','k','R'].map(k=>pick(d,nearest,k));
      p.textContent=labels[d.branch]+': requested '+number(target,6)+' nm; sample '+number(nearest[wi],6)+
        ' nm (offset '+number(nearest[wi]-target,6)+' nm) — n '+number(values[0],6)+
        ', k '+number(values[1],6)+', R '+number(values[2],6)+' %'+
        (values.some(v=>v===null)?' · unavailable values are marked —.':'');
    }
    out.append(p);
  }
}
async function importFolder(files){
  if(!files.length)return;
  const token=++importGeneration;++generation;loaded=[];cache.clear();localFiles.clear();
  $('explorer-controls').disabled=true;setBusy(true);renderEmpty();
  document.body.dataset.ready='loading';status('Reading the selected local catalogue…');
  try{
    const catalogs=files.filter(f=>f.name==='catalog.json');
    if(catalogs.length!==1)throw new Error('Select one data folder containing exactly one catalog.json');
    const file=catalogs[0],prefix=file.webkitRelativePath.slice(0,-'catalog.json'.length);
    const candidate=await readJSON(file);if(token!==importGeneration)return;
    if(candidate.schema_version!==1||!candidate.families||!Array.isArray(candidate.materials)||!candidate.materials.length)
      throw new Error('Unsupported catalogue schema (expected explorer schema_version 1)');
    const map=new Map();
    for(const f of files)if(f.webkitRelativePath.startsWith(prefix))map.set('data/'+f.webkitRelativePath.slice(prefix.length),f);
    const ids=new Set();
    for(const m of candidate.materials){
      if(typeof m.id!=='string'||!m.id||ids.has(m.id)||!candidate.families[m.family]||!m.runs||!Object.keys(m.runs).length)
        throw new Error('Catalogue contains an invalid or duplicate material');
      ids.add(m.id);
      for(const [branch,run] of Object.entries(m.runs)){
        if(!['PBE','GW'].includes(branch)||!run.metadata)throw new Error('Unsupported calculation entry');
        for(const channel of ['density','current'])for(const scope of ['native','screening']){
          const spec=run.channels?.[channel]?.[scope];
          if(!spec||typeof spec.url!=='string'||!Array.isArray(spec.sources)||!map.has(spec.url))
            throw new Error('Incomplete data folder: a catalogue spectrum is missing');
        }
      }
    }
    catalog=candidate;localFiles=map;
    $('total-materials').textContent=catalog.materials.length;
    $('total-runs').textContent=catalog.materials.reduce((n,m)=>n+Object.keys(m.runs).length,0);
    $('family').replaceChildren(option('all','All families'));
    for(const[k,v]of Object.entries(catalog.families).sort((a,b)=>a[1].localeCompare(b[1])))$('family').append(option(k,v));
    resetState();$('explorer-controls').disabled=false;updateMaterialList(state.material);
  }catch(error){
    if(token!==importGeneration)return;
    document.body.dataset.ready='error';$('total-materials').textContent='—';$('total-runs').textContent='—';
    $('material-title').textContent='No data loaded';$('selection-detail').textContent='Select a complete local data folder.';
    status(error.message,true);
  }
}
function start(){
  $('local-folder').addEventListener('change',e=>importFolder(Array.from(e.target.files)));
  $('probe-form').addEventListener('submit',e=>{e.preventDefault();renderProbe();});
  for(const b of appRoot.querySelectorAll('[data-probe]'))b.addEventListener('click',()=>{$('probe-wl').value=b.dataset.probe;renderProbe();});
    let timer;$('search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>updateMaterialList(),180);});
    for(const id of ['family','include-excluded'])$(id).addEventListener('change',()=>updateMaterialList());
    $('material').addEventListener('change',selectMaterial);
    for(const id of ['branch','channel'])$(id).addEventListener('change',()=>{state[id]=$(id).value;refresh();});
    for(const id of ['component','polarization'])$(id).addEventListener('change',()=>{state[id]=$(id).value;render();updateURL();});
    $('sampling').addEventListener('change',()=>{state.sampling=$('sampling').value;if(state.sampling==='screening'&&(state.min<200||state.max>1200)){state.min=200;state.max=1200;activeRange='all';state.log=false;}else activeRange='custom';syncRange();refresh();});
    $('log-axis').addEventListener('change',()=>{state.log=$('log-axis').checked;render();updateURL();});
    for(const b of appRoot.querySelectorAll('[data-range]'))b.addEventListener('click',()=>{activeRange=b.dataset.range;if(activeRange!=='full'){[state.min,state.max]=presets[activeRange];state.log=false;}syncRange();refresh();});
    $('range-form').addEventListener('submit',e=>{e.preventDefault();const lo=Number($('min-wl').value),hi=Number($('max-wl').value);if(!(Number.isFinite(lo)&&Number.isFinite(hi)&&lo>0&&hi>lo)){status('Enter a positive lower wavelength and a higher upper wavelength.',true);return;}state.min=lo;state.max=hi;activeRange='custom';if(lo<200||hi>1200)state.sampling='native';syncRange();refresh();});
    $('more-rows').addEventListener('click',()=>{tableLimit+=200;renderTable();});
    $('download-csv').addEventListener('click',downloadCSV);
    $('download-view').addEventListener('click',()=>saveBlob(new Blob([JSON.stringify(viewMetadata(),null,2)],{type:'application/json'}),fileStem()+'_metadata.json'));
    for(const b of appRoot.querySelectorAll('[data-download]'))b.addEventListener('click',()=>downloadFigure(b.dataset.download,b.dataset.format));
    window.DFTExplorer={getState:()=>({...state}),getRows:plottedRows,getMetadata:viewMetadata};
  syncRange();setBusy(true);
  document.body.dataset.ready='empty';
}
start();
})();
