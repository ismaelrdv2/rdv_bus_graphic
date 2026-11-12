"""Regressões alpha.9: fontes de sistema, JSON e faixa inferior em 9:16.
Executáveis Svelte/Tauri exigem compilação com npm e cargo no Linux.
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]


def test_font_backend_and_ui():
    rust=(ROOT/'src-tauri/src/lib.rs').read_text()
    cargo=(ROOT/'src-tauri/Cargo.toml').read_text()
    app=(ROOT/'src/App.svelte').read_text()
    scene=(ROOT/'src/components/ScenePreview.svelte').read_text()
    prop=(ROOT/'src/components/PropertiesPanel.svelte').read_text()
    assert 'fontdb = ' in cargo
    assert 'async fn list_system_fonts()' in rust
    assert 'list_system_fonts,' in rust
    assert 'desktop_default_output_directory' in rust
    assert 'getSystemFontFamilies' in app
    assert 'onFontFamily={updateSelectedFontFamily}' in app
    assert 'Fonte do elemento' in prop
    assert 'onTextFormat(editing.id, editing.key, { family: value });' in scene
    assert 'on:change={(event) => setFontFamily(event.currentTarget.value)}' in scene
    assert 'HTMLSelectElement' in scene  # não bloquear abertura do seletor
    for name in ('HudShape.svelte','LegacyShape.svelte','BottomTechnical.svelte'):
        shape=(ROOT/'src/components'/name).read_text()
        assert 'fontStack' in shape, name


def test_portrait_renderer():
    path=ROOT/'src/components/BottomTechnical.svelte'
    source=path.read_text()
    assert 'clipPath' in source
    assert 'data-edit-caption' in source
    assert "legacyPhase(time,duration,1.3,.5)" in source
    assert 'rowProgress' in source
    assert 'i%2' in source and 'Math.floor(i/2)' in source
    preview=(ROOT/'src/components/ScenePreview.svelte').read_text()
    assert 'BOTTOM_BAR_HANDLES' in preview and "['n']" in preview
    assert 'isBottomBar(element,project.canvas.width,project.canvas.height)' in preview
    assert (ROOT/'src/lib/video.ts').read_text().count('supersampled.width = width * quality') == 1


def test_core_typescript_geometry_fonts():
    tsc=shutil.which('tsc')
    if not tsc:
        raise AssertionError('TypeScript instalado é obrigatório para testes de regressão deste pacote.')
    with tempfile.TemporaryDirectory(prefix='rdv-alpha9-') as tmp:
        sources=[ROOT/'src/lib'/name for name in (
            'types.ts','fonts.ts','geometry.ts','timing.ts','brand.ts','richtext.ts','legacy.ts','validation.ts','templates.ts','inlineText.ts')]
        subprocess.run([tsc,'--target','es2022','--module','commonjs','--strict','--skipLibCheck',
            '--lib','dom,es2022','--rootDir',str(ROOT/'src/lib'),'--outDir',tmp,
            *map(str,sources)],check=True,cwd=ROOT,capture_output=True,text=True)
        js=r'''
const assert=require('node:assert/strict');
const root=process.argv[1];
const {makeElement,newProject}=require(root+'/templates.js');
const {validateProject}=require(root+'/validation.js');
const {isBottomBar,elementBaseHeight,PORTRAIT_BAR_HEIGHT}=require(root+'/geometry.js');
const {normalizeFontName,fontStack}=require(root+'/fonts.js');
assert.equal(PORTRAIT_BAR_HEIGHT,650);
assert.equal(normalizeFontName('Noto Sans'), 'Noto Sans');
assert.equal(normalizeFontName('foo;stroke:red'), 'Inter');
assert.match(fontStack('Times New Roman'),/^"Times New Roman", Arial/);
const pr=newProject();pr.canvas={...pr.canvas,width:1080,height:1920};
const tech=makeElement('technical'); tech.style.width=640; tech.style.y=0;
tech.style.fontFamily='DejaVu Sans';
tech.textFormatting={heading:{family:'Liberation Sans',bold:true}};
const free=makeElement('freeText');free.freeTextStyle='technicalBar';free.style.width=640;
const full=makeElement('technical');full.technicalLayout='legacyFullscreen';
pr.elements=[tech,free,full];
const [a,b,c]=validateProject(pr).elements;
assert.ok(isBottomBar(a,1080,1920));
assert.ok(isBottomBar(b,1080,1920));
assert.ok(!isBottomBar(c,1080,1920));
for (const e of [a,b]) {
  assert.equal(e.style.x,0);assert.equal(e.style.y,1270);
  assert.equal(e.style.width,1080);assert.equal(e.style.scaleX,1);
  assert.equal(elementBaseHeight(e,1920),650);
}
assert.equal(elementBaseHeight(c,1920),1920);
assert.equal(c.style.y,0);assert.equal(c.style.width,1080);
assert.equal(a.style.fontFamily,'DejaVu Sans');
assert.equal(a.textFormatting.heading.family,'Liberation Sans');
const horizontal={...pr,canvas:{...pr.canvas,width:1920,height:1080}};
const [side]=validateProject(horizontal).elements;
assert.ok(!isBottomBar(side,1920,1080));
assert.equal(elementBaseHeight(side,1080),1080);
console.log('OK alpha9: fontes, 9:16, legado, full screen, 16:9.');
'''
        subprocess.run(['node','-e',js,tmp],check=True,cwd=ROOT,capture_output=True,text=True)
