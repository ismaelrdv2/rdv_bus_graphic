"""Validação de estilo e apresentação da etiqueta compacta."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def src(path): return (ROOT/path).read_text()
def test_model_and_validation():
    assert "export type CompactTextDisplay = 'both' | 'first' | 'second' | 'alternate'" in src('src/lib/types.ts')
    assert "freeTextDisplay: 'both' as const" in src('src/lib/templates.ts')
    assert "freeTextDisplay:" in src('src/lib/validation.ts')
def test_two_renderers():
    old=src('src/components/LegacyShape.svelte')
    new=src('src/components/HudShape.svelte')
    for x in (old,new):
        assert 'singleLineText' in x and 'compactTextWeights' in x
    assert "element.freeTextStyle === 'legacyLabel' ? element.visualPreset !== 'studio'" in new
    assert "freeText && element.freeTextStyle === 'legacyLabel'" in new
    assert "compactLabel = element.kind === 'freeText' && element.freeTextStyle === 'legacyLabel'" in old
def test_controls():
    panel=src('src/components/PropertiesPanel.svelte')
    for label in ('Texto 1 e Texto 2','Somente Texto 1','Somente Texto 2','Alternar Texto 1'):
        assert label in panel
    assert "onFreeTextDisplay={updateSelectedFreeTextDisplay}" in src('src/App.svelte')
