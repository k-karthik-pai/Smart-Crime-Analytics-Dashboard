const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../assets/analytics.js');
// Synthetic fixtures are deliberately confined to tests, never shipped as user data.
const row=(extra={})=>({District_Name:'Test district',FIR_Year:2020,FIR_Stage:'Pending',UnitName:'Test station',...extra});
test('CSV handles BOM, quoted commas, newlines, escaped quotes and CRLF',()=>{
  assert.deepEqual(A.parseCSV('\uFEFFa,b\r\n"one,two","line\n""quoted"""\r\n'),[{a:'one,two',b:'line\n"quoted"'}]);
  for(const text of ['a,a\n1,2','a,b\n1','a,b\n"bad,2','a,b\n"a"x,2'])assert.throws(()=>A.parseCSV(text));
});
test('invalid imports fail rather than partially entering analysis',()=>{
  for(const invalid of [[],{},[row({FIR_Year:'2020x'})],[row({FIR_Year:9999})],[row({Male:-1})],[row({Male:true})],[row({Latitude:91,Longitude:0})],[row({Latitude:12})],[row({Accused_Count:1,Arrested_Count:2})],[row(),row({UnitName:''})]])assert.throws(()=>A.validateRecords(invalid));
});
test('unknown counts stay missing; explicit zero remains known',()=>{
  const {records}=A.validateRecords([row({Male:0,Female:2}),row({FIR_Year:2021})]);const r=A.report(records);
  assert.deepEqual(r.totals.Male,{value:0,known:1});assert.deepEqual(r.totals.Female,{value:2,known:1});assert.deepEqual(r.totals.Boy,{value:0,known:0});
  assert.equal(r.change,0);assert.equal(r.mapped.length,0);
});
test('annual change never invents a baseline for absent years',()=>{
  assert.equal(A.report(A.validateRecords([row(),row({FIR_Year:2022})]).records).change,null);
  assert.equal(A.change(5,0),null);assert.equal(A.change(15,10),50);assert.equal(A.report([]).change,null);
});
test('identical analysis rows are retained with a warning count',()=>{
  const r=A.validateRecords([row(),row()]);assert.equal(r.records.length,2);assert.equal(r.duplicates,1);
});
test('stations with the same name in different districts remain distinct',()=>{
  const r=A.report(A.validateRecords([row(),row({District_Name:'Second test district'})]).records);assert.equal(r.stations.length,2);
});
test('grouping treats special object-property names as data',()=>{
  assert.deepEqual(A.group([{k:'__proto__'},{k:'__proto__'},{k:'constructor'}],'k'),[['__proto__',2],['constructor',1]]);
});
test('CSV escapes quotes and neutralizes spreadsheet formulas',()=>{
  const csv=A.csv([['=1+1',' @SUM(1)','a"b','line\ntext',12]]);
  assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('"\' @SUM(1)"'));assert.ok(csv.includes('"a""b"'));
});
test('all original metro numbers are preserved exactly',()=>{
  const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');const d=require('../data/metro.json');
  // Frozen after an exact comparison against original revision ba92b06.
  // No Git history is needed when testing an exported source archive.
  const expected={cities:'bef37ed0110ab687bdde33484206c194524d37736132a3e915984e721bcce41d',crimes:'d461a06303e9440ace6b78390ba38a0af2272b129f94a41b16d43560ecb6c685',trend:'c51aaed97c046b1529de0e47b3eb9ad1f50b8cb8b9dfb66b35adc3551514d565'};
  for(const key of Object.keys(expected))assert.equal(crypto.createHash('sha256').update(JSON.stringify(d[key])).digest('hex'),expected[key]);
  const context={};vm.runInNewContext(fs.readFileSync('assets/data.js','utf8'),context);assert.deepEqual(JSON.parse(JSON.stringify(context.METRO_DATA)),d);
});
