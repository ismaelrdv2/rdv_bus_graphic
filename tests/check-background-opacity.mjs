import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../src/lib/',import.meta.url)),cache=new Map();
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path){const p=resolve(root,path.endsWith('.ts')?path:path+'.ts');if(cache.has(p))return cache.get(p);const out={};cache.set(p,out);const js=ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports',js)(name=>load(resolve(dirname(p),name)),out);return out;}
const {backgroundAlpha}=load('palette');
for(const [value,want] of [[undefined,1],[100,1],[0,0],[37,.37],[-1,0],[150,1],[NaN,1]])assert.equal(backgroundAlpha(value),want);
for(const path of ['HudShape','LegacyShape','BottomTechnical','BroadcastShape'])assert(read('src/components/'+path+'.svelte').includes('paint.backgroundAlpha'));
const a=read('src/App.svelte');assert(a.includes('palette:{...project.palette,preset,colors:'));assert(a.includes('{#if exportingVideo}\n  <ProductionProgress'));assert(a.includes('showExportVideo=false;exportingVideo=true'));assert(read('src/components/ScenePreview.svelte').includes('backgroundOpacity:project.palette?.backgroundOpacity??100'));
assert(read('src/lib/validation.ts').includes('backgroundOpacity:safeNumber(paletteRaw.backgroundOpacity,100,0,100)'));
assert(read('src/components/Navigator.svelte').includes('{#if exporting}<ProductionProgress'));
console.log('Opacidade global: preenchimentos, valor padrão, persistência e janela independente OK.');
