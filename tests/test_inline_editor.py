"""Regressões alpha.8: atributos SVG editáveis e limpeza na exportação.

Não substitui a compilação Svelte; rode npm run check no Linux para validar a UI.
"""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]

def test_editable_fields():
    text='\n'.join((ROOT/'src/components'/n).read_text(encoding='utf-8') for n in ('HudShape.svelte','LegacyShape.svelte'))
    assert text.count('data-edit-field') >= 35
    assert text.count('data-edit-caption') >= 4
    for field in ('heading','line1','line2'):
        assert f'data-edit-field="{field}"' in text
    scene=(ROOT/'src/components/ScenePreview.svelte').read_text(encoding='utf-8')
    for needle in ('startTextEdit','<textarea', 'floating-format','wrapSelectedText', 'onEditCaption', 'onTextFormat', 'onParagraphFormat'):
        assert needle in scene
    video=(ROOT/'src/lib/video.ts').read_text(encoding='utf-8')
    for needle in ("removeAttribute('data-edit-field')", "removeAttribute('data-edit-caption')", 'supersampled.width = width * quality'):
        assert needle in video

def test_icons():
    source=(ROOT/'src/components/LegacyShape.svelte').read_text(encoding='utf-8')
    assert 'viewBox="0 0 24 24"' in source
    assert 'width="42" height="42"' in source
    assert 'translate(30 29) scale(1.8)' not in source

def test_persistence():
    for f in ('src/lib/types.ts','src/lib/validation.ts','src/lib/templates.ts'):
        source=(ROOT/f).read_text(encoding='utf-8')
        assert 'textFormatting' in source, f
    assert 'technicalCaptions' in (ROOT/'src/lib/validation.ts').read_text(encoding='utf-8')

if __name__ == '__main__':
    test_editable_fields();test_icons();test_persistence()
    print('OK: metadados SVG, editor flutuante, formatação JSON, ícones e supersampling')
