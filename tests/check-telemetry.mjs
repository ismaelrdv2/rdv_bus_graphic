import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/telemetry.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const track=m.normalizeTrack([{t:0,lat:0,lon:0,speed:0,bearing:350},{t:1000,lat:0,lon:.0001,speed:10,bearing:10},{t:9000,lat:0,lon:.001,speed:12}]);
assert.equal(m.at(track,500).speed,5);assert.equal(m.at(track,500).bearing,0);assert.equal(m.at(track,5000),null);assert.equal(m.at(track,-1),null);
assert.equal(m.parseTrack('time,lat,lon,speed_kmh\\n2026-01-01T00:00:00Z,0,0,36\\n2026-01-01T00:00:01Z,0,.001,36'.replaceAll('\\n','\n'),'x.csv').points[0].speed,10);
const demo=m.demoTrack();assert(demo.demo);assert(demo.points.length===61);
const view={width:1920,height:1080,corner:'bottom-right',scale:1,opacity:1,heading:true,tilt:false,radius:200,autoZoom:true,theme:'dark',gauge:'analog',map:true,palette:{primary:'#ff0000',secondary:'#aaaaaa',background:'#000000'}};
assert(m.frameSvg(demo,demo.points[20].t,view).includes('DEMONSTRAÇÃO'));assert(m.frameSvg(demo,demo.points[20].t,view).includes('#ff0000'));
assert.equal(m.parseMap(JSON.stringify({type:'FeatureCollection',features:[{geometry:{type:'LineString',coordinates:[[0,0],[1,1]]}}]})).length,1);
console.log('Telemetria: normalização, interpolação, lacunas, CSV, mapa e SVG OK.');

assert.equal(m.coverage(demo,demo.points[0].t,60),1);
assert.equal(m.bestAlignment(demo,demo.points[60].t,60).origin,'end');
assert.equal(m.bestAlignment(demo,Date.UTC(2027,0,1),53).start,demo.points[0].t);
assert.equal(m.coverage(demo,Date.UTC(2027,0,1),60),0);
const ui=readFileSync(new URL('../src/components/Navigator.svelte',import.meta.url),'utf8');assert(ui.includes('Sincronizar automaticamente')&&ui.includes('--safe-area-inset-top')&&ui.includes('Gerar MP4 de telemetria'));

const manual=m.makeManualTrack([{time:0,speedKmh:0,street:'A'},{time:10,speedKmh:40,street:'B'}],15);
assert.equal(m.at(manual,5000).speed*3.6,20);assert.equal(m.at(manual,5000).street,'A');assert.equal(m.at(manual,10000).street,'B');assert.equal(m.at(manual,12000),null);
assert(!m.manualHasMap(manual));assert(!m.frameSvg(manual,5000,view).includes('mapclip'));assert(m.frameSvg(manual,5000,view).includes('ESTIMADO'));
assert.equal(m.parseTrack(m.serializeTrack(manual,15),'manual.rdvgps').manualKeys.length,2);
assert(!m.serializeTrack(manual,15).includes('"lat"'));
const located=m.makeManualTrack([{time:0,speedKmh:20,street:'A',lat:0,lon:0},{time:10,speedKmh:40,street:'B',lat:0,lon:.001}],10);
assert(m.manualHasMap(located));assert(m.frameSvg(located,5000,view).includes('TRAJETO ESTIMADO'));assert(Math.abs(m.at(located,5000).lon-.0005)<1e-9);
assert.throws(()=>m.makeManualTrack([{time:0,speedKmh:-1}],10));assert.throws(()=>m.makeManualTrack([{time:0,speedKmh:5,lat:0}],10));
console.log('Manual: interpolação, limites, vias, coordenadas opcionais e persistência OK.');
