"""Smoke regressions for palette and typography color roles in alpha.9.3."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def source(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_palette_presets_and_html_rgb_inputs():
    script = source('src/lib/palette.ts')
    for preset in ('purple-gold','blue-orange','green-yellow','red-gold','pink-cyan'):
        assert preset in script
    assert 'export function parseColor(' in script
    assert 'export function toHex(' in script
    assert 'export function toRgb(' in script

def test_palette_persistent_validation():
    types = source('src/lib/types.ts')
    validation = source('src/lib/validation.ts')
    assert 'palette?: ProjectPalette;' in types
    assert 'textColors?: Partial<Record<TextColorKey, TextColorRole>>' in types
    assert "['white','primary','secondary','original']" in validation
    assert "paletteRaw = isObject(raw.palette)" in validation

def test_panel_controls_and_app_callbacks():
    panel = source('src/components/PalettePanel.svelte')
    inspector = source('src/components/PropertiesPanel.svelte')
    app = source('src/App.svelte')
    assert 'paleta personalizada' in panel.lower()
    assert 'type="color"' in panel
    assert 'type="number"' in panel
    assert 'Cor de todos os textos do projeto' in panel
    assert 'onTextColor(field,' in inspector
    assert 'changeProjectPaletteColor(' in app
    assert 'changeAllProjectTextColor(' in app

def test_all_three_renderers_use_palette():
    for shape in ('HudShape.svelte','LegacyShape.svelte','BottomTechnical.svelte'):
        script = source('src/components/' + shape)
        assert 'palettePaint' in script, shape
        assert 'textColor(element,' in script, shape
    assert 'textColor(element,\'footer\',\'secondary\')' in source('src/components/BottomTechnical.svelte')

def test_original_default_white_is_preserved():
    script = source('src/lib/palette.ts')
    assert "defaultRole === 'white'" in script
    assert "return BRAND.text" in script
    assert "fieldOverride === 'original'" in script
