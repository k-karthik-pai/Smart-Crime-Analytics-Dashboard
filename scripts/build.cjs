const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const out = path.resolve(__dirname, '../dist');
fs.mkdirSync(out, {recursive:true});
for (const file of ['index.html','yearly_trend.html','top_cities.html','top_crimes.html','district_analysis.html','about.html']) fs.copyFileSync(file,path.join(out,file));
for (const dir of ['assets','data']) fs.cpSync(dir,path.join(out,dir),{recursive:true});
// Keep checked-in browser libraries beside the source HTML as well as in dist.
// Direct file opening and root-directory static hosting must work offline.
fs.mkdirSync('vendor/leaflet/images',{recursive:true});
fs.copyFileSync('node_modules/chart.js/dist/chart.umd.js','vendor/chart.js');
fs.copyFileSync('node_modules/chart.js/dist/chart.umd.js.map','vendor/chart.umd.js.map');
for (const file of ['leaflet.js','leaflet.js.map','leaflet.css']) fs.copyFileSync(path.join('node_modules/leaflet/dist',file),path.join('vendor/leaflet',file));
fs.cpSync('node_modules/leaflet/dist/images','vendor/leaflet/images',{recursive:true});
fs.copyFileSync('node_modules/chart.js/LICENSE.md','vendor/CHART-LICENSE.md');
fs.copyFileSync('node_modules/leaflet/LICENSE','vendor/LEAFLET-LICENSE');
fs.cpSync('vendor',path.join(out,'vendor'),{recursive:true});
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Built static release in dist/');
