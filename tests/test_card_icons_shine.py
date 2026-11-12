"""Ícones legados e brilhos opcionais sem vazamento para os formatos Desktop."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def src(p): return (R/p).read_text()
hud=src('src/components/HudShape.svelte')
old=src('src/components/LegacyShape.svelte')
bottom=src('src/components/BottomTechnical.svelte')
def test_icons_and_masks():
    icons=src('src/lib/cardIcons.ts')
    for x in ('location','route','date','driver','credit','default'):assert x+':' in icons
    for x in (hud,old):assert 'CARD_ICONS[element.kind] || CARD_ICONS.default' in x
    overlay=src('src/components/ShineOverlay.svelte')
    assert '<clipPath id={clipId}' in overlay and '<path d={shape}/>' in overlay
    assert 'clip-path={`url(#${clipId})`}' in overlay
def test_all_renderers_and_diagonals():
    for x in (hud,old,bottom):
        assert '<ShineOverlay' in x and '<DiagonalGlow' in x
        assert 'element.shineEnabled!==false' in x
        assert 'element.diagonalGlowEnabled===true' in x
    assert 'technical ? panelPath' in hud and 'isTechSide?techShape' in old
def test_controls_and_persistence():
    panel=src('src/components/PropertiesPanel.svelte')
    app=src('src/App.svelte')
    assert 'onShineToggle' in panel and 'onDiagonalGlowToggle' in panel
    assert 'updateSelectedShine' in app and 'updateSelectedDiagonalGlow' in app
    validate=src('src/lib/validation.ts')
    assert 'item.shineEnabled!==false' in validate
    assert 'item.diagonalGlowEnabled===true' in validate
