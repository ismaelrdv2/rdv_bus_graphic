"""Regressões dos ícones sociais em Texto livre (Desktop)."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def src(path):return (ROOT/path).read_text()
def test_svg_assets_and_choices():
    icon=src('src/components/SocialIcon.svelte')
    for key in ('facebook','instagram','x','tiktok','twitch','whatsapp','telegram','discord'):
        assert f"icon === '{key}'" in icon
        assert f"'{key}'" in src('src/lib/types.ts')
        assert f"'{key}'" in src('src/components/PropertiesPanel.svelte')
def test_both_visual_engines():
    for path in ('src/components/LegacyShape.svelte','src/components/HudShape.svelte'):
        render=src(path)
        assert "import SocialIcon" in render
        assert "<SocialIcon" in render
        assert "freeSocial" in render
    assert "clipStart = freeSocial ? 92 : 32" in src('src/components/LegacyShape.svelte')
    assert "bodyLeft = fullPage ? fullMargin : freeSocial ? 100 : 34" in src('src/components/HudShape.svelte')
def test_backward_compatible_project_files():
    assert "freeTextIcon: 'none' as const" in src('src/lib/templates.ts')
    assert "freeTextIcon:" in src('src/lib/validation.ts')
    assert "onFreeTextIcon={updateSelectedFreeTextIcon}" in src('src/App.svelte')
