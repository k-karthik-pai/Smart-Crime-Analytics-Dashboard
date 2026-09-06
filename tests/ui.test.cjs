const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function load(page,setup){
  const dom=new JSDOM(fs.readFileSync(page,'utf8'),{runScripts:'outside-only',url:'http://localhost/'+page});
  if(setup)setup(dom.window);
  for(const file of ['assets/data.js','assets/analytics.js','assets/app.js'])dom.window.eval(fs.readFileSync(file,'utf8'));
  return dom;
}
test('every route initializes without chart CDN availability',()=>{
  for(const page of ['index.html','yearly_trend.html','top_cities.html','top_crimes.html','district_analysis.html','about.html']){
    const dom=load(page),d=dom.window.document;
    assert.equal(d.querySelectorAll('nav [aria-current="page"]').length,1);
    for(const a of d.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(!/^(https?:|#)/.test(href))assert.ok(fs.existsSync(href),href);}
    dom.window.close();
  }
});
test('chart configurations follow selected data and previous charts are destroyed',()=>{
  const instances=[];const dom=load('top_cities.html',w=>{w.Chart=class{constructor(canvas,config){this.config=config;instances.push(this);}destroy(){this.destroyed=true;}};});
  const d=dom.window.document;assert.equal(instances[0].config.data.labels.length,10);assert.equal(instances[0].config.data.datasets[0].data[0],298988);
  d.getElementById('search').value='Kochi';d.getElementById('search').dispatchEvent(new dom.window.Event('input'));
  assert.equal(instances.at(-1).config.data.labels[0],'Kochi');assert.equal(instances.at(-1).config.data.datasets[0].data[0],13273);assert.ok(instances[0].destroyed);dom.window.close();
});
test('clearing during an import prevents stale records from reappearing',async()=>{
  const dom=load('district_analysis.html'),d=dom.window.document,input=d.getElementById('file-input');let resolve;
  Object.defineProperty(input,'files',{value:[{name:'test.json',size:100,text:()=>new Promise(r=>{resolve=r;})}]});
  const pending=input.onchange();assert.equal(d.getElementById('clear-data').disabled,false);d.getElementById('clear-data').click();
  resolve(JSON.stringify([{District_Name:'Test',UnitName:'Test',FIR_Year:2020,FIR_Stage:'Test'}]));await pending;
  assert.ok(d.getElementById('district-content').hidden);assert.equal(d.getElementById('district-scope').textContent,'');assert.equal(d.getElementById('import-status').textContent,'No records loaded.');dom.window.close();
});
test('city and crime controls include all values, search, sorting, empty states',()=>{
  for(const [page,total] of [['top_cities.html',19],['top_crimes.html',15]]){
    const dom=load(page),w=dom.window,d=w.document,limit=d.getElementById('limit'),search=d.getElementById('search');
    assert.equal(d.querySelectorAll('tbody tr').length,10);limit.value='all';limit.dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('tbody tr').length,total);
    d.getElementById('order').value='asc';d.getElementById('order').dispatchEvent(new w.Event('change'));
    const counts=[...d.querySelectorAll('tbody tr')].map(r=>+r.children[1].textContent.replaceAll(',',''));assert.ok(counts[0]<=counts.at(-1));
    search.value='no such record';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('tbody tr').length,0);assert.ok(d.getElementById('export-ranking').disabled);dom.window.close();
  }
});
test('district import, filters, malicious labels, failed replacement, and clear',async()=>{
  const dom=load('district_analysis.html'),w=dom.window,d=w.document,input=d.getElementById('file-input');
  const records=[{District_Name:'<img src=x onerror=alert(1)>',FIR_Year:2020,FIR_Stage:'Pending',UnitName:'__proto__',Male:1},{District_Name:'Another test district',FIR_Year:2021,FIR_Stage:'Convicted',UnitName:'Test station',Male:0}];
  const upload=async text=>{Object.defineProperty(input,'files',{value:[{name:'test.json',size:text.length,text:async()=>text}],configurable:true});await input.onchange();};
  await upload(JSON.stringify(records));assert.equal(d.getElementById('district-content').hidden,false);assert.match(d.getElementById('district-scope').textContent,/2 of 2/);assert.equal(d.querySelectorAll('img').length,0);
  const f=d.getElementById('district-filter');f.value=records[0].District_Name;f.dispatchEvent(new w.Event('change'));assert.match(d.getElementById('district-scope').textContent,/1 of 2/);
  await upload('[{}]');assert.match(d.getElementById('import-status').textContent,/Previous valid dataset retained/);assert.match(d.getElementById('district-scope').textContent,/1 of 2/);
  d.getElementById('year-filter').value='2021';d.getElementById('year-filter').dispatchEvent(new w.Event('change'));assert.match(d.getElementById('district-scope').textContent,/0 of 2/);assert.ok(d.getElementById('export-district').disabled);
  d.getElementById('clear-data').click();assert.ok(d.getElementById('district-content').hidden);assert.equal(d.getElementById('location-table').textContent,'');dom.window.close();
});
