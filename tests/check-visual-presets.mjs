import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
function compile(path,deps={}) {
  const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  const fn=vm.runInNewContext('(function(require,exports){'+js+'})',{},{timeout:1000});
  fn(dep=>{assert(Object.hasOwn(deps,dep),'Dependência inesperada: '+dep);return deps[dep];},exports);
  return exports;
}
const timing={
  clamp:(v,low,high)=>Math.min(high,Math.max(low,Number.isFinite(v)?v:low)),
  easeOutCubic:v=>1-(1-Math.min(1,Math.max(0,v)))**3,
};
const legacy=compile('src/lib/legacy.ts',{'./timing':timing});
const animation=compile('src/lib/visualAnimation.ts',{'./legacy':legacy});
const sample=(mode,t,variant='label',count=2)=>animation.visualMotionFrame(mode,t,5.3,variant,count);
const near=(v,w)=>assert(Math.abs(v-w)<1e-7,`Esperado ${w}, obtido ${v}`);
near(sample('legacy',0).panel,0);
near(sample('legacy',.4).panel,1);
near(sample('legacy',.55).gold,1);
near(sample('legacy',.8).value,1);
near(sample('legacy',5.3).panel,0);
near(sample('legacy',0,'technical',6).rows[0],0);
near(sample('legacy',1.49,'technical',6).rows[5],1);
assert(sample('legacy',.44).iconScale>1,'Ícone Studio sem escala elástica');
for(const mode of ['none','fade','slide']){
  const f=sample(mode,0);
  assert.equal(f.active,false);
  near(f.panel,1);
  near(f.value,1);
}
const hud=read('src/components/HudShape.svelte');
const old=read('src/components/LegacyShape.svelte');
const bottom=read('src/components/BottomTechnical.svelte');
const scene=read('src/components/ScenePreview.svelte');
assert(hud.includes("shouldUseLegacy = element.visualPreset === 'legacy'"));
for(const marker of ['studioMotion = visualMotionFrame','studioUseWipe','studioHeadingAlpha','studioValueAlpha',
'studioRowReveals','studioWideBar','studioPresentationBar','stroke={accent} opacity={studioGold}'])
  assert(hud.includes(marker),`Studio sem a etapa: ${marker}`);
assert(hud.includes("['fullPage','legacyPresentationSlide']"),'Slide Clássico sem visual Studio');
assert(hud.includes("['fullscreen','legacyFullscreen']"),'Ficha completa sem visual Studio');
assert(old.includes("['technicalBar','technicalAlpha1','fullTechnical']"),'Ficha compacta sem visual Clássico');
assert(old.includes("['legacyPresentationSlide','fullPage']"),'Página inteira sem visual Clássico');
assert(bottom.includes("element.visualPreset === 'studio'")&&bottom.includes('panelShape'));
assert(!scene.includes("'legacy'&&!legacyArt?'slide'"),'Movimento da cena duplica a animação v6');
assert(!scene.includes("element.animation === 'legacy' && !hasLegacyArt ? 'slide'"),'Fallback obsoleto no Desktop');
console.log('Studio/Clássico independentes, curvas v6 e ficha retrato: OK');
