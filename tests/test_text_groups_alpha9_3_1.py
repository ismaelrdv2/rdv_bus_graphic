"""Checks for independent color controls and persistence (Desktop 0.1.0-alpha.9.3.1)."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(name):return (ROOT/name).read_text(encoding='utf8')

def test_three_independent_controls_are_visible_in_inspector():
    panel=read('src/components/PropertiesPanel.svelte')
    for label in ('Cor do título','Cor do corpo','Cor do texto secundário'):
        assert label in panel
    assert 'value={textGroupAsSelected(selected,group.key)}' in panel
    assert 'onTextGroup(group.key,' in panel
    assert 'onProjectTextGroup(group.key,' in panel

def test_app_has_individual_and_project_actions():
    app=read('src/App.svelte')
    assert 'changeSelectedTextGroup(' in app
    assert 'changeProjectTextGroup(' in app
    assert 'withTextGroupColor(' in app
    assert 'onProjectTextGroup={changeProjectTextGroup}' in app

def test_groups_are_persisted_without_breaking_old_json():
    types=read('src/lib/types.ts')
    validation=read('src/lib/validation.ts')
    template=read('src/lib/templates.ts')
    assert "'title' | 'body' | 'secondary'" in types
    assert 'textGroups?: Partial<Record<TextColorGroup, TextColorRole>>;' in types
    assert 'const rawGroups = isObject(item.textGroups) ? item.textGroups : {}' in validation
    assert 'validGroups' in validation
    assert 'original.textGroups' in template

def test_selecting_one_group_preserves_other_groups_and_field_overrides():
    s=read('src/lib/palette.ts')
    assert 'function textGroupFor(' in s
    assert "if (key === 'heading') return 'title'" in s
    assert "key.startsWith('caption')" in s
    assert "if (key === 'line2' && !technicalValues) return 'secondary'" in s
    assert 'if (textGroupFor(element, key) === group) delete overrides[key]' in s
    assert 'textGroups: { ...element.textGroups, [group]: role }' in s
    for c in ('HudShape.svelte','LegacyShape.svelte','BottomTechnical.svelte'):
        assert 'textColor(element,' in read('src/components/'+c)
    assert 'fill="#aebbd0"' not in read('src/components/HudShape.svelte')
    assert 'fill="#f9fbff"' not in read('src/components/HudShape.svelte')
