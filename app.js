import { calcMargin, calcSize, calcSticker, money, fixed, n } from './math.js';

const DEFAULTS = {
  margin: { mode:'outsource',qty:10,factory:18,material:2.8,ink:0.6,machine:0.3,packaging:1,delivery:15,design:30,overhead:0,target:35,rounding:'0.01',manualPrice:'' },
  size: { width:2,height:5,unit:'ft',qty:1,rate:2.5,waste:0,minArea:0,areaStep:'0.01',finishing:2,delivery:5,design:0,target:35,rounding:'1' },
  sticker: { paper:'A4',paperWidth:210,paperHeight:297,shape:'rect',stickerWidth:50,stickerHeight:30,margin:5,gap:2,bleed:0,qty:100,reserve:5,paperCost:1.2,inkCost:0.8,laminateCost:0,cutCost:0.5,setupCost:3,target:40,rounding:'0.05' }
};
const MODULES = {
  margin:{ crumb:'MARGIN & HARGA',title:'Kira harga dengan <em>tepat.</em>',subtitle:'Dari kos kilang hingga harga jual — semuanya dikira dalam satu tempat.',name:'Margin & Harga' },
  size:{ crumb:'KALKULATOR SAIZ',title:'Setiap inci ada <em>nilai.</em>',subtitle:'Masukkan saiz dan kadar kilang, harga jual terus dikira.',name:'Kalkulator Saiz' },
  sticker:{ crumb:'KALKULATOR STICKER',title:'Maksimumkan setiap <em>sheet.</em>',subtitle:'Optimumkan susunan sticker dan kira kos setiap tempahan.',name:'Kalkulator Sticker' }
};
const $ = (q,root=document) => root.querySelector(q);
const $$ = (q,root=document) => [...root.querySelectorAll(q)];
const deepCopy = x => JSON.parse(JSON.stringify(x));
const makeDefault = () => ({ version:1,page:'margin',theme:'dark',forms:deepCopy(DEFAULTS),presets:[],history:[] });
let app = makeDefault();
let database = null;
let fallbackStore = false;
let timer;
let toastTimer;
let deferredInstall = null;

function openDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('Tiada IndexedDB'));
    const request = indexedDB.open('fr-printmargin-db',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('app');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function dbGet(db){return new Promise((resolve,reject)=>{
  const req=db.transaction('app','readonly').objectStore('app').get('main');
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
});}
function dbSet(db,data){return new Promise((resolve,reject)=>{
  const tx=db.transaction('app','readwrite');
  tx.objectStore('app').put(data,'main');
  tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
});}
function validateImported(raw){
  if(!raw || typeof raw!=='object' || !raw.forms || typeof raw.forms!=='object') throw new Error('Struktur backup tidak sah.');
  const clean=makeDefault();
  for(const module of Object.keys(DEFAULTS)){
    if(raw.forms[module] && typeof raw.forms[module]==='object'){
      for(const key of Object.keys(DEFAULTS[module])){
        const value=raw.forms[module][key];
        if(typeof value==='number' || typeof value==='string') clean.forms[module][key]=value;
      }
    }
  }
  clean.page=Object.hasOwn(MODULES,raw.page)?raw.page:'margin';
  clean.theme=raw.theme==='light'?'light':'dark';
  clean.presets=Array.isArray(raw.presets)?raw.presets.slice(0,200).filter(p=>p && Object.hasOwn(MODULES,p.module) && p.values && typeof p.values==='object' && typeof p.name==='string').map(p=>({id:String(p.id||crypto.randomUUID()),name:p.name.slice(0,80),module:p.module,values:p.values,createdAt:p.createdAt||new Date().toISOString()})):[];
  clean.history=Array.isArray(raw.history)?raw.history.slice(0,80).filter(h=>h && Object.hasOwn(MODULES,h.module) && h.values && typeof h.values==='object').map(h=>({id:String(h.id||crypto.randomUUID()),module:h.module,summary:String(h.summary||'Pengiraan').slice(0,140),values:h.values,createdAt:h.createdAt||new Date().toISOString()})):[];
  return clean;
}
async function initStorage(){
  try {
    database=await openDB();
    const saved=await dbGet(database);
    if(saved) app=validateImported(saved);
  } catch(e) {
    fallbackStore=true;
    try { const saved=localStorage.getItem('fr-printmargin-v1'); if(saved) app=validateImported(JSON.parse(saved)); }
    catch(ignore) {console.warn('Tidak dapat baca simpanan:',ignore);}
    showToast('IndexedDB tidak tersedia. Cuba simpanan browser biasa.');
  }
}
function scheduleSave(){clearTimeout(timer); timer=setTimeout(()=>persist(),400);}
async function persist(){
  try {
    if(database && !fallbackStore) await dbSet(database,deepCopy(app));
    else localStorage.setItem('fr-printmargin-v1',JSON.stringify(app));
  } catch(err){console.error('Gagal simpan:',err);showToast('Gagal simpan data. Sila eksport backup.');}
}
function showToast(text){const node=$('#toast');node.textContent=text;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),3200);}
function isGood(page, result){return page==='margin' ? true : result.isValid;}
function getResult(page){
  const v=app.forms[page];
  return page==='margin'?calcMargin(v):page==='size'?calcSize(v):calcSticker(v);
}
function refreshInputs(page){
  const form=$(`#form-${page}`);
  const values=app.forms[page];
  $$('[name]',form).forEach(input=>{
    const val=values[input.name]; if(val===undefined)return;
    if(input.type==='radio')input.checked=input.value===String(val);
    else input.value=String(val);
  });
  updateConditional(page);
}
function updateConditional(page){
  if(page==='margin'){
    const inHouse=app.forms.margin.mode==='inhouse';
    $$('.inhouse-only').forEach(node=>node.hidden=!inHouse);
    $$('.outsource-only').forEach(node=>node.hidden=inHouse);
  }
  if(page==='sticker'){
    const v=app.forms.sticker;
    $$('.paper-custom').forEach(node=>node.hidden=v.paper!=='custom');
    $$('.sticker-height-field').forEach(node=>node.hidden=v.shape==='circle');
    $('#sticker-width-label').textContent=v.shape==='circle'?'Diameter sticker':'Lebar sticker';
  }
}
function switchPage(page){
  if(!Object.hasOwn(MODULES,page))return;
  app.page=page;
  $$('.nav-item').forEach(el=>{
    const selected=el.dataset.page===page;
    el.classList.toggle('active',selected);
    if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
  });
  $$('.page-panel').forEach(el=>{const selected=el.id===`page-${page}`;el.hidden=!selected;el.classList.toggle('active',selected)});
  $('#breadcrumb').textContent=MODULES[page].crumb;
  $('#page-title').innerHTML=MODULES[page].title;
  $('#page-description').textContent=MODULES[page].subtitle;
  updatePresetCount();renderPage(page);scheduleSave();
  if(window.innerWidth<741)window.scrollTo({top:0,behavior:'smooth'});
}
function updatePresetCount(){
  $('#preset-count').textContent=app.presets.filter(p=>p.module===app.page).length;
}
function pricePanel(r,label='Harga jual dicadangkan',per='unit'){
  return `<div class="result-primary"><div class="result-header"><span>✦ ${(r.isManual?'HARGA JUAL DIGUNAKAN':label).toUpperCase()}</span><span class="symbol">↗</span></div>
    <div class="hero-price">${money(r.salePrice)} <small>/ ${per}</small></div>
    <p class="result-sub">Margin sasaran ${fixed(r.target,0)}% · Harga dibundarkan ke atas</p>
    <div class="total-highlight"><span>Jumlah jualan ${r.qty} ${per}</span><strong>${money(r.revenue)}</strong></div>
    ${r.isManual?`<p class="preview-note">Cadangan automatik: ${money(r.suggested)} / ${per}</p>`:''}
  </div>`;
}
function detailsPanel(r,additional=[],per='unit'){
  const alert=r.salePrice<r.unitCost?'<div class="alert">⚠ Harga jual lebih rendah daripada kos yang dimasukkan. Semak sebelum beri harga kepada pelanggan.</div>':
  r.margin+1e-6<r.target?'<div class="alert">⚠ Margin sebenar kurang daripada margin sasaran kerana harga jual pilihan sendiri.</div>':'';
  return `<div class="card results-details"><h3 class="card-title">Pecahan keuntungan</h3>
    <div class="stat-grid"><div class="stat"><span>Untung tempahan</span><strong class="${r.profit<0?'bad':'good'}">${money(r.profit)}</strong></div>
    <div class="stat"><span>Margin sebenar</span><strong class="${r.margin<0?'bad':'good'}">${fixed(r.margin,1)}%</strong></div>
    <div class="stat"><span>Kos / ${per}</span><strong>${money(r.unitCost)}</strong></div><div class="stat"><span>Markup</span><strong>${fixed(r.markup,1)}%</strong></div></div>
    <dl class="value-list"><div class="value-row"><dt>Jumlah kos</dt><dd>${money(r.totalCost)}</dd></div><div class="value-row"><dt>Harga jual digunakan / ${per}</dt><dd>${money(r.salePrice)}</dd></div><div class="value-row"><dt>Untung / ${per}</dt><dd>${money(r.profitPerUnit)}</dd></div>${additional.map(([key,value])=>`<div class="value-row"><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl>
    ${alert}
    <div class="results-foot"><button type="button" class="button button-outline" data-result-action="save">☆ Simpan Kiraan</button><button type="button" class="button button-secondary" data-result-action="copy">⇧ Salin</button></div>
  </div>`;
}
function notePanel(note){return `<div class="note"><span class="note-icon">ⓘ</span><span>${note}</span></div>`;}
function emptyPanel(message){return `<div class="card results-details"><h3 class="card-title">Belum boleh dikira</h3><p class="lead">${message}</p></div>`;}
function renderMargin(){
  const r=getResult('margin');
  $('#result-margin').innerHTML=pricePanel(r,'Harga jual dicadangkan')+detailsPanel(r,[['Kaedah pengeluaran',r.type==='inhouse'?'Cetak sendiri':'Outsource kilang'],['Jumlah kos produksi',money(r.production*r.qty)]])+
    notePanel('Kos penghantaran, design dan overhead diagihkan kepada semua unit dalam tempahan. Tambah semua kos sebenar untuk anggaran untung yang lebih tepat.');
}
function renderSize(){
  const r=getResult('size');
  $('#result-size').innerHTML=!r.isValid ? emptyPanel('Masukkan lebar dan tinggi yang lebih besar daripada 0.') :
    pricePanel(r,'Harga jual dicadangkan')+detailsPanel(r,[['Luas sebenar / unit',`${fixed(r.sqft,2)} sqft`],['Luas dalam meter persegi',`${fixed(r.sqm,3)} m²`],['Luas dicaj / unit',`${fixed(r.billedArea,2)} sqft`],['Kos cetakan kilang',money(r.productionTotal)]])+
    notePanel('Luas dicaj = maksimum antara minimum caj luas dan luas yang termasuk allowance, dibundarkan mengikut tetapan. Semak minimum caj sebenar supplier.');
}
function stickerPreview(r){
  if(!r.isValid) return `<div class="card sheet-preview-card"><div class="preview-title"><h3 class="card-title">Preview susunan</h3></div><div class="sheet-preview"><p class="empty-preview">Sticker tidak muat dalam kawasan cetak. Semak dimensi, margin dan bleed.</p></div></div>`;
  const count=Math.min(180,r.perSheet);
  const tiles=[];
  const strokeWidth=Math.min(1,Math.max(.25,Math.min(r.paperW,r.paperH)/500));
  for(let i=0;i<count;i++){
    const col=i%r.cols, row=Math.floor(i/r.cols);
    const x=r.margin+col*(r.tileW+r.gap),y=r.margin+row*(r.tileH+r.gap);
    if(r.isCircle){
      const radius=r.width/2;
      tiles.push(`<circle cx="${x+r.tileW/2}" cy="${y+r.tileH/2}" r="${radius}" fill="#83ded7" fill-opacity=".78" stroke="#138b88" stroke-width="${strokeWidth}"/>`);
    } else {
      tiles.push(`<rect x="${x+r.bleed}" y="${y+r.bleed}" width="${Math.max(0,r.tileW-2*r.bleed)}" height="${Math.max(0,r.tileH-2*r.bleed)}" rx="${Math.min(r.width,r.height)*.045}" fill="#83ded7" fill-opacity=".78" stroke="#138b88" stroke-width="${strokeWidth}"/>`);
    }
  }
  const svg=`<svg role="img" aria-label="Susunan ${r.perSheet} sticker pada kertas" viewBox="0 0 ${r.paperW} ${r.paperH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><rect width="${r.paperW}" height="${r.paperH}" rx="2" fill="#f2f6f9"/><rect x="${r.margin}" y="${r.margin}" width="${r.usableW}" height="${r.usableH}" fill="#f4f8fa" stroke="#9aa9bb" stroke-dasharray="2 2" stroke-width="${strokeWidth}"/>${tiles.join('')}</svg>`;
  return `<div class="card sheet-preview-card"><div class="preview-title"><h3 class="card-title">Preview susunan</h3><span>${fixed(r.paperW,0)} × ${fixed(r.paperH,0)} mm</span></div><div class="sheet-preview">${svg}</div><p class="preview-note">${r.useRotated?'Disusun putar 90° untuk hasil lebih banyak.':'Disusun mengikut orientasi asal.'} ${r.perSheet>180?'Preview 180 unit pertama sahaja.':''} Susunan grid seragam; bukan mixed nesting.</p></div>`;
}
function renderSticker(){
  const r=getResult('sticker');
  const root=$('#result-sticker');
  if(!r.isValid){root.innerHTML=emptyPanel('Sticker terlalu besar atau tidak muat. Kurangkan saiz, margin, jarak atau bleed.')+stickerPreview(r);return;}
  root.innerHTML=pricePanel(r,'Harga jual sticker','sticker')+
    `<div class="card results-details"><h3 class="card-title">Hasil susun atur</h3><div class="stat-grid"><div class="stat"><span>Sticker / sheet</span><strong class="good">${r.perSheet} pcs</strong></div><div class="stat"><span>Sheet diperlukan</span><strong>${r.sheets}</strong></div><div class="stat"><span>Kolum × Baris</span><strong>${r.cols} × ${r.rows}</strong></div><div class="stat"><span>Kos / sticker</span><strong>${r.unitCost<1?`RM ${fixed(r.unitCost,4)}`:money(r.unitCost)}</strong></div></div><dl class="value-list"><div class="value-row"><dt>Normal vs putar</dt><dd>${r.normal.count} vs ${r.rotated.count} / sheet</dd></div><div class="value-row"><dt>Unit dicetak (termasuk allowance)</dt><dd>${r.reserveQty} pcs</dd></div><div class="value-row"><dt>Kapasiti lebihan selepas order</dt><dd>${r.leftover} pcs</dd></div><div class="value-row"><dt>Kos / sheet</dt><dd>${money(r.costPerSheet)}</dd></div></dl></div>`+
    stickerPreview(r)+detailsPanel(r,[['Jumlah kos sheet',money(r.sheets*r.costPerSheet)],['Kos setup / tempahan',money(app.forms.sticker.setupCost)]],'sticker')+
    notePanel('Pengiraan layout menggunakan grid seragam dengan pilihan orientasi asal atau putar 90°. Tidak mengira potongan campuran, ruang pencetak khusus atau bentuk die-cut kompleks.');
}
function renderPage(page){if(page==='margin')renderMargin();else if(page==='size')renderSize();else renderSticker();}
function currentSummary(){
  const r=getResult(app.page), p=app.page;
  if(p==='size')return `${fixed(r.sqft,2)} sqft · ${r.qty} pcs · ${money(r.salePrice)}/unit`;
  if(p==='sticker')return `${r.perSheet} pcs/sheet · ${r.sheets} sheet · ${money(r.salePrice)}/sticker`;
  return `${r.type==='inhouse'?'Cetak sendiri':'Outsource'} · ${r.qty} pcs · ${money(r.salePrice)}/unit`;
}
function saveCalculation(){
  const result=getResult(app.page);
  if(!isGood(app.page,result)){showToast('Betulkan saiz dahulu sebelum menyimpan.');return;}
  app.history.unshift({id:crypto.randomUUID(),module:app.page,summary:currentSummary(),values:deepCopy(app.forms[app.page]),createdAt:new Date().toISOString()});
  app.history=app.history.slice(0,80);
  persist();showToast('Pengiraan disimpan dalam Sejarah.');
}
async function copyCalculation(){
  const page=app.page,result=getResult(page);
  if(!isGood(page,result)){showToast('Tiada hasil yang sah untuk disalin.');return;}
  const text=[
    'FR PRINTMARGIN — RINGKASAN DALAMAN',
    `Modul: ${MODULES[page].name}`,
    `Ringkasan: ${currentSummary()}`,
    `Kuantiti pelanggan: ${result.qty}`,
    `Kos / unit: ${money(result.unitCost)}`,
    `Harga jual / unit: ${money(result.salePrice)}`,
    `Jumlah kos: ${money(result.totalCost)}`,
    `Jumlah jualan: ${money(result.revenue)}`,
    `Untung tempahan: ${money(result.profit)}`,
    `Margin: ${fixed(result.margin,2)}%`,
    `Markup: ${fixed(result.markup,2)}%`,
    ...(page==='size'?[`Luas: ${fixed(result.sqft,2)} sqft`, `Luas dicaj: ${fixed(result.billedArea,2)} sqft`]:[]),
    ...(page==='sticker'?[`Sticker/sheet: ${result.perSheet}`,`Sheet: ${result.sheets}`]:[]),
    'Nota: Untuk kegunaan dalaman, mengandungi kos dan keuntungan.'
  ].join('\n');
  try {await navigator.clipboard.writeText(text);showToast('Ringkasan disalin (termasuk kos dalaman).');}
  catch(e){
    const area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();
    try{document.execCommand('copy');showToast('Ringkasan disalin.');}catch(err){showToast('Clipboard tidak tersedia.');}
    area.remove();
  }
}
function modalOpen(id){$(id).showModal();}
function modalClose(id){$(id).close();}
function readableDate(date){try{return new Date(date).toLocaleString('ms-MY',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return '-';}}
function renderSavedList(type){
  const presets=type==='presets',list=presets?app.presets:app.history,root=$(presets?'#presets-list':'#history-list');
  root.replaceChildren();
  if(!list.length){const node=document.createElement('div');node.className='empty-list';node.textContent=presets?'Belum ada preset yang disimpan.':'Belum ada pengiraan yang disimpan.';root.append(node);return;}
  list.forEach(item=>{
    const row=document.createElement('div');row.className='saved-row';
    const detail=document.createElement('div');const title=document.createElement('strong');title.textContent=presets?item.name:item.summary;
    const sub=document.createElement('small');sub.textContent=`${MODULES[item.module].name} · ${readableDate(item.createdAt)}`;
    detail.append(title,sub);
    const actions=document.createElement('div');actions.className='saved-actions';
    const load=document.createElement('button');load.type='button';load.className='tiny-button';load.textContent='Buka';load.onclick=()=>{app.forms[item.module]={...deepCopy(DEFAULTS[item.module]),...deepCopy(item.values)};refreshInputs(item.module);switchPage(item.module);modalClose(presets?'#presets-dialog':'#history-dialog');scheduleSave();showToast('Pengiraan dimuatkan.');};
    const del=document.createElement('button');del.type='button';del.className='tiny-button danger';del.textContent='Padam';del.setAttribute('aria-label','Padam rekod');del.onclick=()=>{if(!confirm(`Padam ${presets?'preset':'sejarah'} ini?`))return;const target=presets?app.presets:app.history;const index=target.findIndex(x=>x.id===item.id);if(index>=0)target.splice(index,1);renderSavedList(type);updatePresetCount();persist();};
    actions.append(load,del);row.append(detail,actions);root.append(row);
  });
}
function applyTheme(){
  document.documentElement.dataset.theme=app.theme;
  $('#theme-toggle').textContent=app.theme==='dark'?'☀':'☾';
  $('meta[name="theme-color"]').content=app.theme==='dark'?'#0a1020':'#f2f6fc';
}
function updateConnectivity(){
  const offline=!navigator.onLine;
  $('#connection').classList.toggle('offline',offline);
  $('#connection-text').textContent=offline?'Mod Offline':'Sambungan Aktif';
}
async function exportBackup(){
  await persist();
  const safe=new Blob([JSON.stringify({...app,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(safe); const anchor=document.createElement('a');anchor.href=url;
  anchor.download=`FR-PrintMargin-Backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  showToast('Fail backup JSON telah dihasilkan.');
}
async function importBackup(file){
  if(!file)return;
  if(file.size>8*1024*1024){showToast('Fail backup terlalu besar (maksimum 8MB).');return;}
  try{
    const imported=validateImported(JSON.parse(await file.text()));
    if(!confirm('Import akan menggantikan SEMUA data pengiraan, preset dan sejarah sedia ada. Teruskan?'))return;
    app=imported;
    applyTheme();Object.keys(DEFAULTS).forEach(refreshInputs);
    switchPage(app.page);await persist();modalClose('#backup-dialog');showToast('Backup berjaya dipulihkan.');
  }catch(err){showToast(`Import gagal: ${err.message}`);}
}
function wireEvents(){
  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchPage(btn.dataset.page)));
  for(const module of Object.keys(DEFAULTS)){
    const form=$(`#form-${module}`);
    const update=e=>{
      const target=e.target;
      if(!target.name||target.type==='radio'&&!target.checked)return;
      app.forms[module][target.name]=target.value;
      updateConditional(module);renderPage(module);scheduleSave();
    };
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    form.addEventListener('submit',event=>event.preventDefault());
  }
  $('.main-content').addEventListener('click',e=>{
    const action=e.target.closest('[data-result-action]')?.dataset.resultAction;
    if(action==='save')saveCalculation();if(action==='copy')copyCalculation();
  });
  $('#preset-open').onclick=()=>{ $('#preset-name').value='';modalOpen('#preset-save-dialog');$('#preset-name').focus();};
  $('#preset-save-form').addEventListener('submit',e=>{
    e.preventDefault();const name=$('#preset-name').value.trim();if(!name)return;
    app.presets.unshift({id:crypto.randomUUID(),name:name.slice(0,80),module:app.page,values:deepCopy(app.forms[app.page]),createdAt:new Date().toISOString()});
    app.presets=app.presets.slice(0,200);
    updatePresetCount();persist();modalClose('#preset-save-dialog');showToast('Preset disimpan.');
  });
  $('#presets-list-open').onclick=()=>{renderSavedList('presets');modalOpen('#presets-dialog');};
  const showHistory=()=>{renderSavedList('history');modalOpen('#history-dialog');};
  $('#history-open').onclick=showHistory;$('#history-open-side').onclick=showHistory;
  $('#backup-open').onclick=()=>modalOpen('#backup-dialog');
  $('#export-data').onclick=exportBackup;
  $('#import-data').onclick=()=>$('#import-file').click();
  $('#import-file').onchange=async e=>{await importBackup(e.target.files?.[0]);e.target.value='';};
  $$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
  $('#theme-toggle').onclick=()=>{app.theme=app.theme==='dark'?'light':'dark';applyTheme();scheduleSave();};
  window.addEventListener('online',updateConnectivity);window.addEventListener('offline',updateConnectivity);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#install-button').hidden=false;});
  $('#install-button').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#install-button').hidden=true;};
  window.addEventListener('appinstalled',()=>{$('#install-button').hidden=true;showToast('FR PrintMargin telah dipasang!');});
}
async function startup(){
  wireEvents();await initStorage();
  applyTheme();Object.keys(DEFAULTS).forEach(refreshInputs);switchPage(app.page);updateConnectivity();
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost'||location.hostname==='127.0.0.1')){
    navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker tidak aktif:',err));
  }
}
startup();
