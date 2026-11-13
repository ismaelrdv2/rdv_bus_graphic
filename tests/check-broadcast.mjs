/** Regressão: formatos jornalísticos, animações novas e rodapés compatíveis. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compiled=ts.transpileModule(read('src/lib/timing.ts'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const exports={};
const runner=vm.runInNewContext('(function(require,exports){'+compiled+'})',{},{timeout:2000});
runner(()=>{throw Error('timing não deve importar runtime')},exports);
const check=(style)=>{
  const enter=exports.motionAt(0,5.3,style);
  const hold=exports.motionAt(2.65,5.3,style);
  const exit=exports.motionAt(5.3,5.3,style);
  assert(enter.reveal===0 || enter.scale<1 || enter.alpha===0,'Transição precisa começar fora da cena: '+style);
  assert.equal(hold.reveal,1);
  assert.equal(hold.scale,1);
  assert(exit.reveal===0 || exit.scale<1 || exit.alpha===0,'Transição precisa terminar: '+style);
};
for(const type of ['curtain','zoom','split'])check(type);
assert.equal(exports.motionAt(.1,5.3,'legacy').alpha,1);
assert.equal(exports.motionAt(.1,5.3,'none').reveal,1);
const types=read('src/lib/types.ts');
const geo=read('src/lib/geometry.ts');
const shape=read('src/components/BroadcastShape.svelte');
const brand=read('src/components/FooterBrand.svelte');
const hud=read('src/components/HudShape.svelte');
const old=read('src/components/LegacyShape.svelte');
const bottom=read('src/components/BottomTechnical.svelte');
const scene=read('src/components/ScenePreview.svelte');
const model=read('src/lib/validation.ts');
const ui=read('src/components/PropertiesPanel.svelte');
for(const type of ['newsLabel','newsTicker','newsLowerThird','newsSlide']){
  assert(types.includes("'"+type+"'"),'Estilo ausente: '+type);
  assert(geo.includes("'"+type+"'"),'Altura indefinida: '+type);
}
for(const token of ["style === 'newsLabel'","style === 'newsTicker'","style === 'newsLowerThird'","style === 'newsSlide'"]){
  assert(shape.includes(token),'Formato novo ausente: '+token);
}
assert(hud.includes('<BroadcastShape'));
assert(hud.includes('<FooterBrand'));
assert(old.includes('<FooterBrand'));
assert(bottom.includes('<FooterBrand'));
assert(brand.includes('footerImageData')&&brand.includes('footerMode'));
for(const anim of ["curtain","zoom","split"])assert(ui.includes('value="'+anim+'"'),'Seletor da transição '+anim);
assert(scene.includes('motion.reveal')&&scene.includes('motion.scale'));
assert(model.includes('footerImageData')&&model.includes('footerText')&&model.includes('footerMode'));
assert(ui.includes('footerImageData'),'Não existe seletor da logomarca');
console.log('Transições, 4 formatos de TV e rodapé editável: OK');
