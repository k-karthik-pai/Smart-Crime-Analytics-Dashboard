const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const pages=['index.html','yearly_trend.html','top_cities.html','top_crimes.html','district_analysis.html','about.html'];
test('root HTML pages ship every referenced local script and stylesheet',()=>{
  for(const page of pages){
    const dom=new JSDOM(fs.readFileSync(page,'utf8'));
    for(const node of dom.window.document.querySelectorAll('script[src],link[rel="stylesheet"]')){
      const source=node.getAttribute('src')||node.getAttribute('href');
      assert.ok(!/^https?:/.test(source),`Expected offline asset: ${source}`);
      assert.ok(fs.existsSync(path.resolve(path.dirname(page),source)),`${page} is missing ${source}`);
    }
    dom.window.close();
  }
});
test('bundled chart and map scripts expose their real browser APIs',()=>{
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only'});
  dom.window.eval(fs.readFileSync('vendor/chart.js','utf8'));
  dom.window.eval(fs.readFileSync('vendor/leaflet/leaflet.js','utf8'));
  assert.equal(typeof dom.window.Chart,'function');
  assert.equal(dom.window.Chart.version,'4.4.3');
  assert.equal(typeof dom.window.L.map,'function');
  assert.equal(dom.window.L.version,'1.9.4');
  dom.window.close();
});
