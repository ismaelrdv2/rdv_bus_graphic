"""Testes do layout de texto formatado e compatibilidade JSON (sem npm).

Requer TypeScript global ou npm; não executa Svelte nem Tauri.
"""
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TSC = shutil.which('tsc') or str(ROOT/'node_modules/.bin/tsc')
with tempfile.TemporaryDirectory(prefix='rdv-alpha6-rich-') as tmp:
    files = ['types.ts', 'richtext.ts','brand.ts','timing.ts','templates.ts','geometry.ts','validation.ts']
    subprocess.run([TSC, '--target','es2022','--module','commonjs','--strict','--lib','dom,es2022',
                    '--rootDir', str(ROOT/'src/lib'), '--outDir', tmp,
                    *[str(ROOT/'src/lib'/name) for name in files]], check=True, cwd=ROOT)
    code = r'''
const assert=require('node:assert/strict');
const root=process.argv[1];
const {newProject,makeElement}=require(root+'/templates.js');
const {validateProject}=require(root+'/validation.js');
const {layoutRichText,parseRuns,bulletPrefix,alignedX}=require(root+'/richtext.js');
const {elementBaseHeight,isBar,boundsOf}=require(root+'/geometry.js');
assert.deepEqual(parseRuns('Oi **negrito** *italico* __sublinhado__').map(r=>r.text), ['Oi ','negrito',' ','italico',' ','sublinhado']);
assert.equal(bulletPrefix(2,'numbers'),'3. ');
assert.equal(bulletPrefix(0,'chevrons'),'» ');
const layout=layoutRichText('Uma linha muito longa com **destaque** para quebrar.\nE um segundo parágrafo',140,22,1.3,'chevrons',false,false);
assert.ok(layout.lines.length>=4);
assert.ok(layout.lines.at(-1).lastInParagraph);
assert.equal(alignedX('center',20,300),170);
const p=newProject();
let free=makeElement('freeText');free.freeTextStyle='fullPage';free.fields.line1='Um corpo formatado com **negrito**.\nUma segunda linha';
free.richText={...free.richText,scroll:'vertical',scrollSpeed:75,alignment:'right',bullets:'chevrons'};
p.elements.push(free);
let technical=makeElement('technical');technical.technicalLayout='fullscreen';p.elements.push(technical);
let migrated=validateProject(p);let f=migrated.elements.at(-2);let t=migrated.elements.at(-1);
assert.equal(f.freeTextStyle,'fullPage');assert.equal(f.style.width,1920);assert.equal(f.style.x,0);
assert.equal(f.richText.scrollSpeed,75);assert.equal(f.richText.bullets,'chevrons');
assert.equal(t.technicalLayout,'fullscreen');assert.equal(t.style.width,1920);assert.equal(isBar(t),false);
assert.equal(elementBaseHeight(f,1080),1080);
let old=makeElement('freeText');delete old.richText;delete old.freeTextStyle;p.elements.push(old);
let imported=validateProject(p).elements.at(-1);assert.equal(imported.richText.scroll,'none');assert.equal(imported.freeTextStyle,'classic');
// Escala X/Y continua representando o tamanho da caixa, e não o aspecto das fontes.
free.style.scaleX=1.5;free.style.scaleY=.6;free.freeTextStyle='classic';
const b=boundsOf(free,1080);assert.equal(b.width,free.style.width*1.5);assert.equal(b.height,165*.6);
assert.equal(isBar(free),false);
console.log('OK: formato por trecho, quebra de linha, marcadores, tela inteira, rolagem, escala e migração JSON');
'''
    subprocess.run(['node','-e',code,tmp],check=True)
