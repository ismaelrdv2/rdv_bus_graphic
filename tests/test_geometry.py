"""Executa testes reais sobre os módulos TypeScript compilados temporariamente.

Sem acesso ao registro npm, usa `tsc` (global ou local). Não muda o projeto.
"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TSC = shutil.which('tsc') or str(ROOT / 'node_modules' / '.bin' / 'tsc')
if not Path(TSC).exists() and not shutil.which(TSC):
    raise SystemExit('TypeScript não disponível. Rode npm install antes dos testes.')

with tempfile.TemporaryDirectory(prefix='rdv-alpha5-test-') as temp:
    out = Path(temp)
    inputs = ['types.ts', 'geometry.ts', 'timing.ts', 'brand.ts', 'validation.ts', 'templates.ts']
    cmd = [TSC, '--target', 'es2022', '--module', 'commonjs', '--strict', '--skipLibCheck',
           '--lib', 'dom,es2022', '--rootDir', str(ROOT / 'src/lib'), '--outDir', str(out)]
    cmd.extend(str(ROOT / 'src/lib' / name) for name in inputs)
    subprocess.run(cmd, check=True, cwd=ROOT)
    js = r'''
const assert = require('node:assert/strict');
const root = process.argv[1];
const { makeElement, newProject } = require(root + '/templates.js');
const { validateProject } = require(root + '/validation.js');
const { resizeBounds, elementBaseHeight, isBar, compactCardTextBaselines } = require(root + '/geometry.js');
const baseline = compactCardTextBaselines(102);
assert.ok(baseline.main < baseline.secondary);
assert.ok(baseline.secondary - baseline.main >= 28);
assert.ok(baseline.secondary <= 96); // mantém o texto inferior dentro da cartela.
const project = newProject();
let free = makeElement('freeText');
assert.equal(free.style.scaleX, 1);
assert.equal(free.style.scaleY, 1);
assert.equal(free.freeTextStyle, 'legacyLabel');
assert.equal(elementBaseHeight(free, 1080), 102);
free.freeTextStyle = 'technicalBar';
assert.equal(elementBaseHeight(free, 1080), 1080);
assert.equal(isBar(free), true);
free.freeTextStyle = 'technicalAlpha1';
assert.equal(elementBaseHeight(free, 1080), 480);
const tech = makeElement('technical');
assert.equal(elementBaseHeight(tech, 1920), 650);
assert.equal(isBar(tech), true);
const initial = {x:100, y:100, width:400, height:200};
const se = resizeBounds(initial, 'se', 100, 60, 1920, 1080, false);
assert.deepEqual(se, {x:100, y:100, width:500, height:260});
const nw = resizeBounds(initial, 'nw', 100, 20, 1920, 1080, false);
assert.deepEqual(nw, {x:200, y:120, width:300, height:180});
const west = resizeBounds(initial, 'w', 40, 0, 1920, 1080, false);
assert.deepEqual(west, {x:140, y:100, width:360, height:200});
const holdAspect = resizeBounds(initial, 'se', 100, 10, 1920, 1080, true);
assert.ok(Math.abs(holdAspect.width / holdAspect.height - 2) < 0.000001);
const narrow = resizeBounds(initial, 'nw', 5000, 5000, 1920, 1080, false);
assert.ok(narrow.width >= 100 && narrow.height >= 55);
const legacy = JSON.parse(JSON.stringify(project));
const item = makeElement('freeText');
delete item.style.scaleX;
delete item.style.scaleY;
delete item.freeTextStyle;
delete item.freeTextCaptions;
delete item.visualPreset;
item.animation='slide';
legacy.elements.push(item);
const imported = validateProject(legacy).elements.at(-1);
assert.equal(imported.style.scaleX, 1);
assert.equal(imported.style.scaleY, 1);
assert.equal(imported.freeTextStyle, 'classic');
assert.equal(imported.visualPreset, 'studio');
assert.equal(elementBaseHeight(imported,1080),165);
const changed = {...imported, freeTextStyle:'technicalBar',
  freeTextCaptions:['ROTA','LINHA','EMPRESA','PREFIXO','DATA','LOCAL'],
  style: {...imported.style, scaleX:1.4, scaleY:0.7}};
legacy.elements[legacy.elements.length-1] = changed;
const again = validateProject(legacy).elements.at(-1);
assert.equal(again.style.scaleX, 1.4);
assert.equal(again.style.scaleY, 0.7);
assert.equal(again.freeTextCaptions[0], 'ROTA');
console.log('OK: geometria, escala vetorial, alças, Shift, estilos e migração JSON.');
'''
    subprocess.run(['node', '-e', js, str(out)], cwd=temp, check=True)
