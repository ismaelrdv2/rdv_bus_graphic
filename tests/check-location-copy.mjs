import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../src/lib/',import.meta.url)),cache=new Map();
function load(path){const p=resolve(root,path.endsWith('.ts')?path:path+'.ts');if(cache.has(p))return cache.get(p);const out={};cache.set(p,out);const js=ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports',js)(name=>load(resolve(dirname(p),name)),out);return out;}
const {makeElement,copyLocation}=load('templates');
const a=makeElement('location');a.fields.line1='Rua A';a.fields.line2='Cuiabá • MT';a.productionDuration=8;a.productionIncluded=false;a.style.x=120;a.style.y=650;a.textFormatting={line1:{size:34}};
const b=copyLocation(a);assert.notEqual(b.id,a.id);assert.deepEqual(b.fields,a.fields);assert.deepEqual(b.style,a.style);assert.equal(b.productionDuration,8);assert.equal(b.productionIncluded,true);
b.fields.line1='Rua B';b.style.x=10;b.textFormatting.line1.size=30;
assert.equal(a.fields.line1,'Rua A');assert.equal(a.style.x,120);assert.equal(a.textFormatting.line1.size,34);assert.equal(copyLocation(b).fields.line1,'Rua B');
assert.throws(()=>copyLocation(makeElement('date')));
const app=readFileSync(new URL('../src/App.svelte',import.meta.url),'utf8');assert(app.includes("kind==='location'?project.elements.filter(el=>el.kind==='location').at(-1)"));assert(app.includes('const element=copyLocation(previous)'));
console.log('Locais: cópia independente, duração e posição preservadas OK.');
