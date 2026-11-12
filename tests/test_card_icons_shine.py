"""Brilho exclusivo das cartelas, luz diagonal ajustável e margens de leitura da ficha lateral."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def src(file):return (ROOT/file).read_text()
HUD=src("src/components/HudShape.svelte")
OLD=src("src/components/LegacyShape.svelte")
BOTTOM=src("src/components/BottomTechnical.svelte")
GLOW=src("src/components/DiagonalGlow.svelte")
GEO=src("src/lib/technicalGeometry.ts")
def test_vector_card_icons():
    icons=src("src/lib/cardIcons.ts")
    for kind in ("location","date","route","driver","credit","default"):assert kind+":" in icons
    assert "CARD_ICONS[element.kind] || CARD_ICONS.default" in HUD
    assert "CARD_ICONS[element.kind] || CARD_ICONS.default" in OLD
def test_shine_cards_only():
    assert "<ShineOverlay" in HUD and "<ShineOverlay" in OLD
    assert "isCompactCartela(element)" in HUD and "isCompactCartela(element)" in OLD
    assert "<ShineOverlay" not in BOTTOM
    assert 'kind="bar"' not in HUD and 'kind="bar"' not in OLD
    overlay=src("src/components/ShineOverlay.svelte")
    assert "clipPath id={clipId}" in overlay and "<path d={shape}/>" in overlay
def test_diagonal_intensity_every_technical_renderer():
    for body in (HUD, OLD, BOTTOM):
        assert "<DiagonalGlow" in body
        assert "intensity={element.diagonalGlowIntensity ?? 170}" in body
    assert "gain=Math.min(3,Math.max(.5,intensity/100))" in GLOW
    assert "Math.min(1,frame.strength*2.1*gain)" in GLOW
    panel=src("src/components/PropertiesPanel.svelte")
    assert "onDiagonalGlowIntensity" in panel
    assert 'min="50" max="300" step="10"' in panel
    assert "onDiagonalGlowIntensity={updateSelectedDiagonalIntensity}" in src("src/App.svelte")
def test_safe_right_margin_and_legacy_left():
    assert "RIGHT_TECHNICAL_GUTTER = 118" in GEO
    assert "technicalTextRightEdge" in OLD
    assert "techRightLimit-x" in OLD
    assert "innerRight = isRight ? w - 124 : w - 110" in HUD
    assert "technicalPanelBoundary(width, height, y, false)" in GEO
def test_json_backward_compatibility():
    validation=src("src/lib/validation.ts")
    assert "diagonalGlowIntensity:safeNumber(item.diagonalGlowIntensity,170,50,300)" in validation
    assert "diagonalGlowIntensity:170" in src("src/lib/templates.ts")
