/** Numerical reference values recovered from rdv_pacote/rdv_anim.py (v6). */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const source = read('src/lib/legacy.ts');
const compiled = ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const timing = {
  clamp:(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(v)?v:min)),
  easeOutCubic:x=>{const t=Math.min(1,Math.max(0,x));return 1-(1-t)**3;}
};
const exports = {};
vm.runInNewContext('(function(require, exports){'+compiled+'})',
  {}, {timeout:1000})(name=>{assert.equal(name,'./timing');return timing;},exports);
const nearly = (actual,wanted)=>assert(Math.abs(actual-wanted)<1e-7,
  `Esperado ${wanted}, obtido ${actual}`);
const label = exports.legacyLabelMotion;
nearly(label(0).panel,0);
nearly(label(0.1).gold,0);
nearly(label(.40).panel,1);
nearly(label(.55).gold,1);
nearly(label(.28).iconOpacity,0);
nearly(label(.42).iconOpacity,1);
assert(label(.45).iconScale>1, 'Falta overshoot do ícone v6');
nearly(label(.68).label,1);
nearly(label(.80).value,1);
for(const n of [1,2,3,6,8]) nearly(exports.legacyTechnicalEntrance(n),.55+.09*n+.4);
nearly(exports.legacyCornerMotion(0).scale,.86);
nearly(exports.legacyCornerMotion(.55).scale,1);
nearly(exports.legacyPhase(0,5.3,.80,.50),0);
nearly(exports.legacyPhase(.80,5.3,.80,.50),.80);
nearly(exports.legacyPhase(5.3,5.3,.80,.50),0);
const classic=read('src/components/LegacyShape.svelte');
const bottom=read('src/components/BottomTechnical.svelte');
for(const token of ['panelWipeGradientId','mask id={panelWipeId}','goldRevealId',
  'goldBlurId','pIconScale','pIconOpacity','legacyCornerMotion','legacyTechnicalEntrance'])
  assert(classic.includes(token),`Implementação v6 incompleta: ${token}`);
assert(classic.includes('clip-path={`url(#${goldRevealId})`}'),
  'Filete dourado precisa de revelação separada');
assert(bottom.includes('legacyTechnicalEntrance(visibleFields)'),
  'Ficha inferior precisa acompanhar quantidade de campos');
assert(bottom.includes('legacyStage(p, .55 + .09 * i, .32)'),
  'Campos da ficha inferior não obedecem ao v6');
assert(read('src-tauri/tauri.conf.json').includes('com.rdvbus.studio.animationtest'), 'Identificador experimental ausente');
console.log('Curvas v6, estágios SVG e identidade experimental: OK');
