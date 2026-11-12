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
          assert.equal(g.technicalSeparatorEnd(w,h,y,true),w-118);
        }
        assert.ok(g.technicalSeparatorEnd(w,h,first,false)<g.technicalSeparatorEnd(w,h,last,false));
        assert.equal(g.technicalTextX(false),92);
        assert.ok(g.technicalTextX(true)<134);
        assert.ok(g.technicalTextX(true)-43>g.technicalPanelBoundary(w,h,first,true)+5);
        assert.equal(g.RIGHT_TECHNICAL_GUTTER,118);
        assert.equal(g.technicalTextRightEdge(w,true),w-118);
        assert.ok(g.technicalTextRightEdge(w,true)-g.technicalTextX(true)>=390);
        const xs = [first,first+120,first+240,last].map(y=>g.technicalRowTextX(w,h,y,true));
        assert.ok(xs.every((x,i)=>i===0 || x<xs[i-1]),'x acompanha a inclinação decrescente');
        for(const y of [first,first+120,first+240,last]){
          const x=g.technicalRowTextX(w,h,y,true);
          const boundary=g.technicalPanelBoundary(w,h,y,true);
          assert.ok(x-boundary>=g.RIGHT_TECHNICAL_TEXT_PADDING-.1);
          assert.ok(x-43>boundary+25, 'chevrons afastados da diagonal');
          assert.ok(x+g.technicalTextAvailableWidth(w,h,y,true)<=g.technicalTextRightEdge(w,true)-13);
        }
        assert.equal(g.technicalRowTextX(w,h,first,false),92);
        console.log('OK: linhas dentro da diagonal e margem lateral à direita');
        """
        subprocess.run(['node','-e',js,target],check=True,cwd=ROOT)

def test_renderers_use_safe_geometry():
    legacy=(ROOT/'src/components/LegacyShape.svelte').read_text(encoding='utf-8')
    studio=(ROOT/'src/components/HudShape.svelte').read_text(encoding='utf-8')
    assert 'technicalSeparatorEnds[i]' in legacy
    assert 'technicalTextX(sideRight)' in legacy
    assert 'techRightLimit-x' in legacy
    assert 'technicalRowTextX(w,height,rowStart+32,true) : 92' in studio
    assert 'rowWidth = isRight ? technicalTextAvailableWidth' in studio
    assert 'technicalRowTextX(w,h,y+32,true)' in legacy
    assert 'innerRight = isRight ? w - 124 : w - 110' in studio
