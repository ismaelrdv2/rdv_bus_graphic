from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
PANEL=(ROOT/'src/components/PropertiesPanel.svelte').read_text()
GEO=(ROOT/'src/lib/geometry.ts').read_text()
TEMPL=(ROOT/'src/lib/templates.ts').read_text()
APP=(ROOT/'src/App.svelte').read_text()

def test_tabs_have_distinct_categories_and_palette_is_not_always_expanded():
    for key in ('content','typography','colors','dimensions','motion','palette'):
        assert f"id:'{key}'" in PANEL
    assert 'aria-selected={activeTab === tab.id}' in PANEL
    assert "{#if activeTab === 'content'}" in PANEL
    assert "{:else if activeTab === 'palette'}" in PANEL

def test_compact_cards_use_credit_geometry():
    assert 'CREDIT_CARD_WIDTH = 550' in GEO
    assert 'CREDIT_CARD_HEIGHT = 102' in GEO
    for k in ('location','date','route','driver','credit'):
        assert f"case '{k}':" in TEMPL
    assert "['location','date','route','driver','credit'].includes(element.kind)" in GEO
    assert "if (element.kind === 'technical')" in GEO

def test_existing_projects_can_be_standardized_preserving_content():
    assert 'standardizeCard(el, project.canvas.width, project.canvas.height)' in APP
    assert 'standardizeCard(element, project.canvas.width, project.canvas.height)' in APP
    assert 'return {...element, style:{...element.style' in GEO
    assert 'onStandardizeAll' in PANEL
    assert 'Selecionar texto do corpo para formatar' in PANEL

def test_both_rendering_modes_and_exports_preserved():
    assert (ROOT/'src/components/LegacyShape.svelte').is_file()
    assert (ROOT/'src/components/HudShape.svelte').is_file()
    assert (ROOT/'src/lib/video.ts').is_file()
