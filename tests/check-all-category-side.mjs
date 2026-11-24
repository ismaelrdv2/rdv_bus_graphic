import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/App.svelte');
const panel=read('src/components/PropertiesPanel.svelte');
const templates=read('src/lib/templates.ts');
const validation=read('src/lib/validation.ts');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'0.1.0-alpha.9.3.24');
const content=panel.slice(panel.indexOf("{#if activeTab === 'content'}"),
  panel.indexOf("{:else if activeTab === 'typography'}"));
assert(content.includes('Posição horizontal de {KIND_INFO[selected.kind].label}'));
assert(content.includes('onTechnicalSide(event.currentTarget.value'));
assert(!content.includes("selected.kind==='technical' && (selected.technicalLayout"));
assert(content.includes('<option value="left">À esquerda</option><option value="right">À direita</option>'));
const fn=app.slice(app.indexOf('  function updateTechnicalSide('),
 app.indexOf('  function updateSelectedProductionDuration(',app.indexOf('  function updateTechnicalSide(')));
assert(fn.includes('changeElement(selectedId, element => {'));
assert(fn.includes("x: fullscreen||bottom?0:side==='left'?inset:Math.max(0,available-inset)"));
assert(fn.includes('y:element.style.y'));
assert(fn.includes("const inset=bar?0:Math.min(56,available/4)"));
assert(fn.includes('technicalSide:side'));
assert(validation.includes('technicalSide,'));
assert(!validation.includes("((technical || freeText) ? { technicalSide } : {})"));
assert(templates.includes("technicalSide: kind==='corner'?'right':'left'"));
for(const kind of ['technical','location','route','date','driver','credit','freeText','slide','corner'])
  assert(templates.includes("case '"+kind+"'"), 'Categoria sem modelo: '+kind);
for(const shape of [
 {width:550,scale:1,margin:56},
 {width:640,scale:1,margin:0},
 {width:960,scale:1.3,margin:56},
 {width:1880,scale:1,margin:56},
 {width:260,scale:.75,margin:56}
]){
 const available=Math.max(0,1920-shape.width*shape.scale);
 const inset=Math.min(shape.margin,available/4);
 const left=inset,right=Math.max(0,available-inset);
 assert(left<=right);
 assert(Math.abs(left+right-available)<.001);
 assert(right+shape.width*shape.scale<=1920.001);
}
console.log('Desktop Alpha 9.3.15: posicionamento de todas categorias, validação JSON e preservação de Y OK.');

const wizard=app.slice(app.indexOf('  function chooseWizardElement('),app.indexOf('  function goWizardStep('));
assert(wizard.includes('project.palette?.colors || DEFAULT_PALETTE.colors'));
assert(wizard.includes('accent:colors.primary,secondary:colors.secondary,background:colors.background'));
console.log('Paleta do projeto aplicada aos elementos criados no assistente.');
