"""Regressões do alinhamento da Ficha em tela inteira (alpha.9.2.1)."""
from pathlib import Path
SOURCE = (Path(__file__).resolve().parents[1] / 'src/components/HudShape.svelte').read_text()

def test_fulltechnical_uses_studio_renderer_instead_of_inheriting_legacy():
    assert "(element.visualPreset === 'legacy' && element.freeTextStyle === 'technicalBar')" in SOURCE
    assert "['technicalBar', 'fullTechnical'].includes" not in SOURCE

def test_only_nonempty_fields_take_grid_slots():
    assert 'activeTechnical = technicalValues.map' in SOURCE
    assert '.filter(item => item.value.trim().length > 0)' in SOURCE
    assert '{#each activeTechnical as item, position (item.index)}' in SOURCE
    assert '(fullColumns - countInRow) * (fullCellWidth + 60) / 2' in SOURCE
    assert '(fullGridHeight - fullRows * fullRowHeight' in SOURCE

def test_remaining_legacy_styles_are_kept():
    assert "'legacyPresentationSlide'" in SOURCE
    assert "'legacyHalfBar'" in SOURCE
    assert "'legacyFullBar'" in SOURCE
