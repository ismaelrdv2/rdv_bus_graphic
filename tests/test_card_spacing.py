"""Garantia de espaçamento nos dois renderizadores das cartelas compactas."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CLASSIC=(ROOT/'src/components/LegacyShape.svelte').read_text()
STUDIO=(ROOT/'src/components/HudShape.svelte').read_text()
GEOMETRY=(ROOT/'src/lib/geometry.ts').read_text()

def test_shared_baselines():
    assert 'compactCardTextBaselines(height: number)' in GEOMETRY
    assert 'main: height * .64, secondary: height * .92' in GEOMETRY
    assert 'cardTextY.main' in STUDIO and 'cardTextY.secondary' in STUDIO
    assert 'cardTextY.main' in CLASSIC and 'cardTextY.secondary' in CLASSIC

def test_credit_and_generic_card_use_same_layout():
    assert 'x="28" y={cardTextY.main}' in STUDIO
    assert 'x="28" y={cardTextY.secondary}' in STUDIO
    assert 'x="30" y={cardTextY.main}' in STUDIO
    assert 'x="30" y={cardTextY.secondary}' in STUDIO

def test_not_modify_technical_bars():
    assert 'technicalSeparatorEnds[i]' in CLASSIC
    assert 'technicalTextX(sideRight)' in CLASSIC
    assert 'rowReveals = Array.from({ length: 6 }' in CLASSIC
