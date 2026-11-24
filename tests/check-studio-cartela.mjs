import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=ts.transpileModule(read('src/lib/compactText.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const out={};new Function('exports',js)(out);
const heading='SIGA NOSSA PÁGINA NO INSTAGRAM';const n=[...heading].length;
for(const width of [270,550,850,1000])for(const icon of [false,true]){
 const available=width-(icon?100:34)-34;
 const f=out.fitStudioLine(42,available,3,n,s=>n*s*.68);
 assert(f.size<=42);assert(n*f.size*.68+n*f.spacing<=available);assert(f.spacing<=3);
}
assert.equal(out.fitStudioLine(18,500,3,3,s=>s*2).size,18);
const hud=read('src/components/HudShape.svelte');assert(hud.includes('classicRight-classicLeft'));assert(hud.includes('classicTitle.spacing'));assert(hud.includes('classicSecondary.size'));assert(hud.includes('classicStyle(element,\'heading\')'));assert(hud.includes('classicWidth:Math.max(45'));
console.log('Cartela Studio: largura útil, ícone, tracking e tamanho proporcional OK.');
