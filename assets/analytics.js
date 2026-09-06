(function(root) {
  'use strict';
  const required = ['District_Name','FIR_Year','FIR_Stage','UnitName'];
  const counts = ['Male','Female','Boy','Girl','Accused_Count','Arrested_Count'];
  function parseCSV(text) {
    const rows=[]; let row=[], cell='', quoted=false, closed=false;
    text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
      else if(c==='"'){if(cell || closed)throw Error('Malformed CSV quotation.');quoted=true;}
      else if(c===',' || c==='\n' || c==='\r') {
        row.push(cell);cell='';closed=false;
        if(c!==','){if(c==='\r' && text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}
      }else {if(closed)throw Error('Unexpected text after a quoted CSV field.');cell+=c;}
    }
    if(quoted)throw Error('Unclosed CSV quotation.');
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
    if(rows.length<2)throw Error('The CSV needs a header and at least one record.');
    const headers=rows.shift().map(v=>v.trim());
    if(headers.some(h=>!h) || new Set(headers).size!==headers.length)throw Error('CSV headers must be nonempty and unique.');
    return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`CSV row ${i+2} has ${r.length} fields; expected ${headers.length}.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
  }
  function validateRecords(input) {
    if(!Array.isArray(input) || !input.length)throw Error('Provide a nonempty array of FIR records.');
    if(input.length>100000)throw Error('Maximum 100,000 records per import.');
    const seen=new Set();let duplicates=0;
    const records=input.map((r,i)=>{
      const fail=m=>{throw Error(`Record ${i+1}: ${m}`);};
      if(!r || typeof r!=='object' || Array.isArray(r))fail('expected an object.');
      const out={};
      for(const key of required){if(!(key==='FIR_Year'?['string','number'].includes(typeof r[key]):typeof r[key]==='string') || !String(r[key]).trim())fail(`${key} is required${key==='FIR_Year'?'':' as text'}.`);out[key]=String(r[key]).trim();}
      if(!/^\d{4}$/.test(out.FIR_Year) || +out.FIR_Year<1900 || +out.FIR_Year>new Date().getFullYear())fail('FIR_Year must be a valid year from 1900 through the current year.');
      out.FIR_Year=+out.FIR_Year;
      for(const key of counts){
        const v=r[key];out[key]=null;
        if(v!==undefined && v!==null && v!==''){
          if(!['string','number'].includes(typeof v) || !/^\d+$/.test(String(v).trim()) || !Number.isSafeInteger(+v))fail(`${key} must be a nonnegative integer or blank.`);
          out[key]=+v;
        }
      }
      if(out.Arrested_Count!==null && out.Accused_Count!==null && out.Arrested_Count>out.Accused_Count)fail('Arrested_Count exceeds Accused_Count.');
      for(const key of ['Latitude','Longitude']){
        const v=r[key];out[key]=null;
        if(v!==undefined && v!==null && String(v).trim()!==''){
          if(!['string','number'].includes(typeof v) || !Number.isFinite(+v) || Math.abs(+v)>(key==='Latitude'?90:180))fail(`${key} is out of range.`);
          out[key]=+v;
        }
      }
      if((out.Latitude===null)!==(out.Longitude===null))fail('Latitude and Longitude must be supplied together.');
      out.FIR_Type=typeof r.FIR_Type==='string' && r.FIR_Type.trim()?r.FIR_Type.trim():'Unknown';
      const fingerprint=JSON.stringify(out);if(seen.has(fingerprint))duplicates++;seen.add(fingerprint);
      return out;
    });
    return {records,duplicates};
  }
  function group(records,key){const result=new Map();for(const r of records)result.set(r[key],(result.get(r[key])||0)+1);return [...result].sort((a,b)=>b[1]-a[1] || String(a[0]).localeCompare(String(b[0])));}
  function change(current,previous){return previous>0?(current-previous)/previous*100:null;}
  function report(records){
    const years=group(records,'FIR_Year').sort((a,b)=>a[0]-b[0]);
    const latest=years.at(-1);const prev=latest?years.find(y=>y[0]===latest[0]-1):null;
    const totals=Object.fromEntries(counts.map(key=>[key,{value:records.reduce((n,r)=>n+(r[key]??0),0),known:records.filter(r=>r[key]!==null).length}]));
    const stationGroups=new Map();for(const r of records){const key=JSON.stringify([r.District_Name,r.UnitName]);stationGroups.set(key,(stationGroups.get(key)||0)+1);}
    const stations=[...stationGroups].map(([key,n])=>[JSON.parse(key).join(' / '),n]).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
    return {total:records.length,years,stations,stages:group(records,'FIR_Stage'),types:group(records,'FIR_Type'),totals,change:prev?change(latest[1],prev[1]):null,latestYear:latest?.[0]??null,mapped:records.filter(r=>r.Latitude!==null && r.Longitude!==null)};
  }
  function csv(rows){return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
  const api={parseCSV,validateRecords,group,change,report,csv};
  if(typeof module!=='undefined')module.exports=api;else root.Analytics=api;
})(globalThis);
