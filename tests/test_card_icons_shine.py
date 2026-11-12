"""Regressão para resgate de ícones 0.14 e varredura de brilho no Studio."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
HUD=(ROOT/'src/components/HudShape.svelte').read_text()
LEGACY=(ROOT/'src/components/LegacyShape.svelte').read_text()
ICONS=(ROOT/'src/lib/cardIcons.ts').read_text()

def test_shared_vector_icons():
    for kind in ['location','route','date','driver','credit','default']:
        assert kind+':' in ICONS
    assert 'CARD_ICONS[element.kind] || CARD_ICONS.default' in HUD
    assert 'CARD_ICONS[element.kind] || CARD_ICONS.default' in LEGACY

def test_studio_has_dedicated_text_area():
    assert 'studioTextX = studioCard ? 100 : 30' in HUD
    assert 'studioTextWidth = Math.max(90, w - studioTextX - 34)' in HUD
    assert 'x={studioTextX}' in HUD

def test_studio_sweep_clipped_and_after_enter():
    assert 'studioShineVisible' in HUD
    assert 'clipPath id={`card-shine-${id}`}' in HUD
    assert 'Math.sin(Math.PI * shineElapsed)' in HUD
    assert "element.animation !== 'none'" in HUD
    assert 'time >= shineStart' in HUD

def test_legacy_sweep_preserved():
    assert 'time >= .55 && time < 1.15' in LEGACY
