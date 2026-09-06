/* All imported text is rendered with textContent, never as HTML. */
'use strict';
const $=id=>document.getElementById(id), A=globalThis.Analytics, D=globalThis.METRO_DATA;
const fmt=n=>Number(n).toLocaleString('en-IN');
const charts=new Map();
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function table(id,headers,rows,caption){const host=$(id);host.replaceChildren();const wrap=el('div',undefined,'table-wrap');const t=el('table');if(caption)t.append(el('caption',caption));const head=el('thead'),tr=el('tr');headers.forEach(h=>{const th=el('th',h);th.scope='col';tr.append(th);});head.append(tr);t.append(head);const body=el('tbody');rows.forEach(row=>{const r=el('tr');row.forEach(v=>r.append(el('td',String(v))));body.append(r);});t.append(body);wrap.append(t);host.append(wrap);if(!rows.length)host.append(el('p','No records match these filters.','empty'));}
function metric(host,label,value,note){const card=el('div',undefined,'metric');card.append(el('span',label,'label'),el('strong',value,'value'));if(note)card.append(el('small',note));host.append(card);}
function plot(id,rows,type='bar'){
  charts.get(id)?.destroy();charts.delete(id);const host=$(id);host.replaceChildren();
  if(!rows.length){host.style.height='auto';host.append(el('p','No data for the selected filters.','empty'));return;}
  if(!globalThis.Chart){host.style.height='auto';host.append(el('p','Chart library unavailable. All values remain available in the data table.','notice'));return;}
  const canvas=el('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',rows.map(r=>`${r[0]}: ${r[1]}`).join('; '));host.append(canvas);
  host.style.height=type==='bar'?`${Math.max(260,rows.length*46+45)}px`:'300px';
  const line=type==='line';
  const palette=['#2e6ce6','#427fe9','#5791ec','#68a0ec','#7aafef'];
  function wrapLabel(label) {
    const words=String(label).split(' '),lines=[];let current='';
    for(const word of words){if(current && (current+' '+word).length>23){lines.push(current);current=word;}else current=current?current+' '+word:word;}
    if(current)lines.push(current);return lines;
  }
  charts.set(id,new Chart(canvas,{
    type,
    data:{labels:rows.map(r=>r[0]),datasets:[{
      label:id.startsWith('district-')?'FIR rows':'Recorded incidents',
      data:rows.map(r=>r[1]),
      backgroundColor:line?context=>{
        const area=context.chart.chartArea;
        if(!area)return '#2e6ce61a';
        const gradient=context.chart.ctx.createLinearGradient(0,area.top,0,area.bottom);
        gradient.addColorStop(0,'#2e6ce632');gradient.addColorStop(1,'#2e6ce602');return gradient;
      }:rows.map((_,i)=>palette[Math.min(i,palette.length-1)]),
      borderColor:'#2e6ce6',borderWidth:line?2.5:0,borderRadius:5,
      maxBarThickness:23,tension:0,fill:line,pointRadius:5,
      pointBackgroundColor:'#fff',pointBorderColor:'#2e6ce6',pointBorderWidth:2.5,pointHoverRadius:7
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,indexAxis:line?'x':'y',
      animation:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?false:{duration:350},
      interaction:{intersect:false,mode:'index'},
      layout:{padding:{top:10,right:16,bottom:4}},
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#102b49',padding:13,cornerRadius:8,displayColors:false,titleFont:{size:12},bodyFont:{size:13},callbacks:{label:context=>`${id.startsWith('district-')?'FIR rows':'Incidents'}: ${fmt(line?context.parsed.y:context.parsed.x)}`}}},
      scales:{
        x:{border:{display:false},grid:{display:!line,color:'#edf2f8',drawTicks:false},ticks:{color:'#7489a3',font:{size:11},padding:12,...(!line?{precision:0}: {})},...(!line?{beginAtZero:true}:{})},
        y:{border:{display:false},grid:{display:line,color:'#edf2f8',drawTicks:false},ticks:{color:'#617794',font:{size:11},padding:12,...(line?{precision:0}:{callback:function(value){return wrapLabel(this.getLabelForValue(value));}})},...(line?{beginAtZero:true}:{})}
      }
    }
  }));
}
function download(name,rows){const url=URL.createObjectURL(new Blob([A.csv(rows)],{type:'text/csv;charset=utf-8'}));const link=el('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function sources(indices=[0,1,2]){if(!$('sources'))return;const list=el('ul',undefined,'source-list');indices.forEach(i=>{const li=el('li'),a=el('a',D.sources[i][1]);a.href=D.sources[i][0];a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);});$('sources').append(list,el('p','Original project transcription; source values not independently reverified for this release.','muted'));}
function overview(){const city=[...D.cities].sort((a,b)=>b.count-a.count)[0],crime=[...D.crimes].sort((a,b)=>b.incidents-a.incidents)[0];metric($('overview-metrics'),'Largest recorded city total',city.city,`${fmt(city.count)} IPC incidents · 2022`);metric($('overview-metrics'),'Largest listed violent category',crime.crime,`${fmt(crime.incidents)} incidents · 2022`);metric($('overview-metrics'),'Metro coverage',`${D.cities.length} cities`,'Historical data · not a live feed');sources();}
function trend(){const rows=[...D.trend].sort((a,b)=>a.year-b.year);rows.forEach((r,i)=>{const change=i?A.change(r.count,rows[i-1].count):null;metric($('trend-metrics'),`${r.year} violent incidents`,fmt(r.count),change===null?'First observed year':`${change>0?'+':''}${change.toFixed(1)}% vs ${rows[i-1].year}`);});plot('trend-chart',rows.map(r=>[r.year,r.count]),'line');table('trend-table',['Year','Violent incidents'],rows.map(r=>[r.year,fmt(r.count)]),'Observed annual totals');$('export-trend').onclick=()=>download('violent-trend-2019-2021.csv',[['Year','Violent incidents'],...rows.map(r=>[r.year,r.count])]);sources([0]);}
function ranking(kind){
  const city=kind==='city',name=city?'City':'Crime category';const all=(city?D.cities.map(r=>[r.city,r.count]):D.crimes.map(r=>[r.crime,r.incidents]));
  const controls=$('ranking-controls');controls.className='controls';
  function control(label,id,tag){const l=el('label',label),c=el(tag);c.id=id;l.append(c);controls.append(l);return c;}
  const search=control(`Search ${city?'cities':'categories'}`,'search','input');search.type='search';
  const limit=control('Show','limit','select');[['10','Top 10'],['all','All records']].forEach(([v,t])=>limit.add(new Option(t,v)));
  const order=control('Order','order','select');[['desc','Most incidents'],['asc','Fewest incidents'],['name','Name A–Z']].forEach(([v,t])=>order.add(new Option(t,v)));
  let selected=[];const total=all.reduce((s,r)=>s+r[1],0);
  const update=()=>{selected=all.filter(r=>r[0].toLowerCase().includes(search.value.trim().toLowerCase())).sort((a,b)=>order.value==='name'?a[0].localeCompare(b[0]):(order.value==='asc'?a[1]-b[1]:b[1]-a[1])||a[0].localeCompare(b[0]));const matches=selected.length;if(limit.value!=='all')selected=selected.slice(0,+limit.value);$('ranking-summary').textContent=`Showing ${selected.length} of ${matches} matching records · ${fmt(total)} incidents across the complete listed dataset.`;plot('ranking-chart',selected);table('ranking-table',[name,'Incidents','Share of full dataset'],selected.map(r=>[r[0],fmt(r[1]),`${(r[1]/total*100).toFixed(2)}%`]),`${city?'IPC':'Violent'} incidents · 2022`);$('export-ranking').disabled=!selected.length;};
  search.oninput=update;limit.onchange=update;order.onchange=update;$('export-ranking').onclick=()=>download(`${kind}-incidents-2022.csv`,[[name,'Incidents','Year','Measure'],...selected.map(r=>[...r,2022,city?'IPC incidents':'Violent incidents'])]);update();sources([city?1:2]);
}
function district(){
  let records=[],summary=null,map=null,mapEnabled=false,generation=0;
  const fields=['district-filter','year-filter','stage-filter'];
  const status=(text,error=false)=>{const s=$('import-status');s.textContent=text;s.className=`status ${error?'error':'success'}`;};
  function select(id,key,all){const s=$(id);s.replaceChildren(new Option(all,''));[...new Set(records.map(r=>r[key]))].sort((a,b)=>typeof a==='number'?a-b:a.localeCompare(b)).forEach(v=>s.add(new Option(String(v),String(v))));}
  function removeMap(){if(map){map.remove();map=null;}$('map').hidden=true;}
  function clear(){generation++;records=[];summary=null;mapEnabled=false;removeMap();for(const id of ['district-trend','district-stations']){charts.get(id)?.destroy();charts.delete(id);$(id).replaceChildren();}for(const id of ['district-years-table','district-stations-table','district-stages-table','district-demographics','district-types-table','location-table','district-metrics','district-scope','district-change','map-status'])$(id).replaceChildren();fields.forEach(id=>$(id).replaceChildren());$('district-content').hidden=true;$('district-empty').hidden=false;$('clear-data').disabled=true;$('file-input').value='';status('No records loaded.');}
  function renderMap(){
    removeMap();const locations=summary.mapped;
    $('map-status').textContent=`${fmt(locations.length)} of ${fmt(summary.total)} selected records have supplied coordinates.`;
    table('location-table',['Station','Latitude','Longitude'],locations.slice(0,500).map(r=>[r.UnitName,r.Latitude,r.Longitude]),`First ${Math.min(500,locations.length)} geolocated records`);
    $('enable-map').hidden=mapEnabled;$('enable-map').disabled=!locations.length;
    if(!mapEnabled || !locations.length)return;
    if(!globalThis.L){$('map-status').append(' Map library unavailable; use the coordinate table.');return;}
    $('map').hidden=false;map=L.map('map');L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>{$('map-status').textContent='Map tiles could not load. Coordinate markers and the table still reflect supplied records.';}).addTo(map);
    const grouped=new Map();for(const r of locations){const key=`${r.Latitude},${r.Longitude}`;if(!grouped.has(key))grouped.set(key,{lat:r.Latitude,lng:r.Longitude,count:0});grouped.get(key).count++;}
    const points=[...grouped.values()];for(const p of points.slice(0,3000)){const label=el('span',`${fmt(p.count)} FIR record(s) at supplied coordinates ${p.lat}, ${p.lng}`);L.circleMarker([p.lat,p.lng],{radius:Math.min(18,5+Math.log2(p.count)),color:'#3949ab'}).bindPopup(label).addTo(map);}map.fitBounds(points.map(p=>[p.lat,p.lng]),{padding:[24,24],maxZoom:12});if(points.length>3000)$('map-status').append(' Display limited to the first 3,000 distinct locations.');
  }
  function render(){
    const filtered=records.filter(r=>(!$('district-filter').value || r.District_Name===$('district-filter').value)&&(!$('year-filter').value || String(r.FIR_Year)===$('year-filter').value)&&(!$('stage-filter').value || r.FIR_Stage===$('stage-filter').value));summary=A.report(filtered);
    $('district-scope').textContent=`${fmt(filtered.length)} of ${fmt(records.length)} imported FIR rows · ${$('district-filter').value||'All districts'} · ${$('year-filter').value||'All observed years'} · ${$('stage-filter').value||'All recorded stages'}`;
    $('district-metrics').replaceChildren();metric($('district-metrics'),'Selected FIR rows',fmt(summary.total),'One imported row is counted as one FIR');metric($('district-metrics'),'Observed years',fmt(summary.years.length),summary.years.length?`${summary.years[0][0]}–${summary.latestYear}`:'No matching records');metric($('district-metrics'),'Police stations',fmt(summary.stations.length),'Within the selected records');
    $('district-change').textContent=summary.change===null?'Annual change unavailable: two consecutive observed years and a nonzero previous count are required.':`${summary.latestYear-1} → ${summary.latestYear}: ${summary.change>0?'+':''}${summary.change.toFixed(1)}% change in the selected records. This describes the imported sample, not complete district coverage.`;
    plot('district-trend',summary.years,'line');plot('district-stations',summary.stations.slice(0,10));
    table('district-years-table',['Year','FIR rows'],summary.years.map(([y,n])=>[y,fmt(n)]),'Observed years only; absent years are unknown');
    table('district-stations-table',['Station','FIR rows'],summary.stations.map(([s,n])=>[s,fmt(n)]),'All matching stations; chart shows top 10');
    table('district-stages-table',['Recorded stage','FIR rows'],summary.stages.map(([s,n])=>[s,fmt(n)]));
    table('district-types-table',['FIR type','FIR rows'],summary.types.map(([type,n])=>[type,fmt(n)]));
    table('district-demographics',['Field','Known total','Coverage'],Object.entries(summary.totals).map(([k,v])=>[k,v.known?fmt(v.value):'Unknown',`${fmt(v.known)}/${fmt(summary.total)} rows`]));
    $('export-district').disabled=!summary.total;renderMap();
  }
  $('file-input').onchange=async()=>{
    const token=++generation,file=$('file-input').files[0];if(!file)return;
    try{
      if(file.size>20*1024*1024)throw Error('File exceeds the 20 MB limit.');
      if(!/\.(csv|json)$/i.test(file.name))throw Error('Choose a .csv or .json file.');
      status('Reading and validating records…');$('clear-data').disabled=false;const text=await file.text();if(token!==generation)return;
      const parsed=/\.json$/i.test(file.name)?JSON.parse(text.replace(/^\uFEFF/,'')):A.parseCSV(text);const result=A.validateRecords(parsed);
      records=result.records;mapEnabled=false;select('district-filter','District_Name','All districts');select('year-filter','FIR_Year','All observed years');select('stage-filter','FIR_Stage','All recorded stages');
      $('district-content').hidden=false;$('district-empty').hidden=true;$('clear-data').disabled=false;
      status(`Loaded ${fmt(records.length)} records from ${file.name}.${result.duplicates?` ${fmt(result.duplicates)} repeated analysis row(s) retained; verify whether these represent distinct FIRs.`:''} Completeness and provenance are supplied by you.`);render();
    }catch(e){if(token!==generation)return;status(`Import rejected: ${e.message}${records.length?' Previous valid dataset retained.':''}`,true);}
    finally{if(token===generation){$('file-input').value='';$('clear-data').disabled=!records.length;}}
  };
  fields.forEach(id=>$(id).onchange=render);$('clear-data').onclick=clear;$('reset-filters').onclick=()=>{fields.forEach(id=>$(id).value='');render();};$('enable-map').onclick=()=>{mapEnabled=true;renderMap();};
  $('export-district').onclick=()=>{if(!summary)return;const scope=fields.map(id=>$(id).value||'All');download('district-summary.csv',[['District filter','Year filter','Stage filter'],scope,['Section','Label','Value','Known rows'],['Total','FIR rows',summary.total],...summary.years.map(r=>['Year',...r]),...summary.stations.map(r=>['Station',...r]),...summary.stages.map(r=>['Stage',...r]),...Object.entries(summary.totals).map(([k,v])=>['Count',k,v.known?v.value:'Unknown',v.known])]);};
}
const page=document.body.dataset.page;
if(page==='index.html')overview();else if(page==='yearly_trend.html')trend();else if(page==='top_cities.html')ranking('city');else if(page==='top_crimes.html')ranking('crime');else if(page==='district_analysis.html')district();else sources();
