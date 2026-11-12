"""Compatibilidade e matemática da animação clássica, sem npm/Rust.

Executar: python3 tests/test_legacy.py
Precisa de Node e TypeScript (`tsc`) disponíveis no PATH.
"""
from pathlib import Path
import json
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def test_structure():
    ui = (ROOT / 'src/components/LegacyShape.svelte').read_text()
    inspector = (ROOT / 'src/components/PropertiesPanel.svelte').read_text()
    validation = (ROOT / 'src/lib/validation.ts').read_text()
    app = (ROOT / 'src/App.svelte').read_text()
    for mode in ('legacyLabel', 'legacyHalfBar', 'legacyFullBar',
                 'legacyPresentationBar', 'legacyPresentationSlide'):
        assert mode in ui or mode in app, mode
        assert mode in inspector and mode in validation
    for s in ('legacyFullscreen', 'onFitScrollDuration', 'onVisualPreset'):
        assert s in inspector and s in app, s
    for s in ('scrollLine1', 'scrollLine2', 'scrollPixelsPerSecond', 'scrollRepeats'):
        assert s in ui and s in inspector and s in validation, s
    assert 'canvasWidth={project.canvas.width}' in (ROOT / 'src/components/ScenePreview.svelte').read_text()
    assert 'LegacyShape' in (ROOT / 'src/components/HudShape.svelte').read_text()
    for name in ('src/lib/video.ts', 'src-tauri/src/lib.rs'):
        assert (ROOT/name).is_file()
    assert 'supersampled.width = width * quality' in (ROOT/'src/lib/video.ts').read_text()


def test_javascript():
    if not shutil.which('tsc') or not shutil.which('node'):
        print('AVISO: tsc ou node indisponível; teste da matemática não realizado')
        return
    files = ['src/lib/types.ts', 'src/lib/timing.ts', 'src/lib/legacy.ts',
             'src/lib/brand.ts', 'src/lib/richtext.ts', 'src/lib/templates.ts',
             'src/lib/geometry.ts', 'src/lib/validation.ts']
    with tempfile.TemporaryDirectory(prefix='rdv-legacy-') as tmp:
        args = ['tsc', '--strict', '--target', 'ES2022', '--module', 'commonjs',
                '--moduleResolution', 'node', '--lib', 'es2022,dom', '--skipLibCheck',
                '--outDir', tmp, '--rootDir', str(ROOT/'src'),
                *[str(ROOT/f) for f in files]]
        subprocess.run(args, cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        script = r'''
const assert=require('node:assert/strict');
const {legacyPhase, legacyStage, legacyScrollDistance, legacyScrollTravel, legacyScrollRecommendedDuration}=require('./lib/legacy.js');
const {newProject,makeElement}=require('./lib/templates.js');
const {validateProject}=require('./lib/validation.js');
for (const d of [1,5.3,30]) {
  assert.equal(legacyPhase(0,d,1.43,.65),0);
  assert.equal(legacyPhase(d,d,1.43,.65),0);
  assert.equal(legacyStage(legacyPhase(d,d,1.43,.65),0,.55),0);
  assert.ok(legacyStage(legacyPhase(d/2,d,1.43,.65),0,.55)>0);
}
assert.equal(legacyScrollDistance(.5,200),0);
assert.equal(legacyScrollDistance(1.5,200),200);
assert.equal(legacyScrollTravel(500,300,2,240),1340);
assert.equal(legacyScrollRecommendedDuration(500,300,200,2,240),7.7);
const old=newProject();old.elements=[makeElement('technical'),makeElement('freeText')];
for(const item of old.elements){delete item.visualPreset; item.animation='slide';}
for(const item of old.elements){if(item.richText)delete item.richText.scrollRepeats;}
const migrated=validateProject(old);
assert.deepEqual(migrated.elements.map(e=>e.visualPreset),['studio','studio']);
assert.equal(migrated.elements[1].richText.scrollRepeats,1);
const newFree=makeElement('freeText');
assert.equal(newFree.freeTextStyle,'legacyLabel');
assert.equal(newFree.animation,'legacy');
newFree.richText.scrollLine1=true;newFree.richText.scrollPixelsPerSecond=300;
const round=validateProject({...newProject(),elements:[newFree]});
assert.equal(round.elements[0].richText.scrollLine1,true);
assert.equal(round.elements[0].richText.scrollPixelsPerSecond,300);
round.elements[0].freeTextStyle='legacyPresentationSlide';
const full=validateProject({...round,canvas:{width:1080,height:1920,fps:60,duration:5.3}});
assert.equal(full.elements[0].style.width,1080);
assert.equal(full.elements[0].style.x,0);
const tech=makeElement('technical');tech.technicalLayout='legacyFullscreen';
const parsed=validateProject({...newProject(),elements:[tech]});
assert.equal(parsed.elements[0].technicalLayout,'legacyFullscreen');
console.log('OK: timing de entrada/saída, rolagem original, presets e JSON alpha.6 → alpha.7');
'''
        (Path(tmp)/'test.cjs').write_text(script)
        subprocess.run(['node', str(Path(tmp)/'test.cjs')], cwd=tmp, check=True)


if __name__ == '__main__':
    test_structure()
    test_javascript()
    print('OK: integração estrutural e compatibilidade legada')
