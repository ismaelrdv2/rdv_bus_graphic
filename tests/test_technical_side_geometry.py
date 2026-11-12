"""Garante o limite diagonal e margens internas da ficha técnica lateral."""
from pathlib import Path
import subprocess, shutil, tempfile

ROOT=Path(__file__).resolve().parents[1]
TSC=shutil.which('tsc')

def test_technical_geometry_real_calculation():
    assert TSC, 'tsc deve estar disponível para validar a geometria TS'
    with tempfile.TemporaryDirectory(prefix='rdv-tech-side-') as target:
        subprocess.run([TSC,'--target','es2022','--module','commonjs','--strict',
            '--skipLibCheck','--lib','dom,es2022','--rootDir',str(ROOT/'src/lib'),
            '--outDir',target,str(ROOT/'src/lib/technicalGeometry.ts')],check=True,cwd=ROOT)
        js=r"""
        const assert=require('node:assert/strict');
        const g=require(process.argv[1]+'/technicalGeometry.js');
        const w=640,h=1080, first=h*.214+70, last=first+5*Math.min(142,(h-h*.214-140)/6);
        for(const y of [first,first+120,first+240,last]) {
          const boundary=g.technicalPanelBoundary(w,h,y,false);
          const end=g.technicalSeparatorEnd(w,h,y,false);
          assert.ok(end<=boundary-23,`linha ultrapassou a diagonal: ${end} > ${boundary}`);
          assert.ok(end>g.technicalTextX(false));
          assert.equal(g.technicalSeparatorEnd(w,h,y,true),w-64);
        }
        assert.ok(g.technicalSeparatorEnd(w,h,first,false)<g.technicalSeparatorEnd(w,h,last,false));
        assert.equal(g.technicalTextX(false),92);
        assert.ok(g.technicalTextX(true)<134);
        assert.ok(g.technicalTextX(true)-43>g.technicalPanelBoundary(w,h,first,true)+5);
        assert.ok(w-g.technicalTextX(true)-72>350);
        console.log('OK: linhas dentro da diagonal e margem lateral à direita');
        """
        subprocess.run(['node','-e',js,target],check=True,cwd=ROOT)

def test_renderers_use_safe_geometry():
    legacy=(ROOT/'src/components/LegacyShape.svelte').read_text(encoding='utf-8')
    studio=(ROOT/'src/components/HudShape.svelte').read_text(encoding='utf-8')
    assert 'technicalSeparatorEnds[i]' in legacy
    assert 'technicalTextX(sideRight)' in legacy
    assert 'w-x-(sideRight?72:50)' in legacy
    assert 'innerX = isRight ? 136 : 92' in studio
    assert 'innerRight = isRight ? w - 88 : w - 110' in studio
