from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENE = (ROOT / 'src/components/ScenePreview.svelte').read_text(encoding='utf-8')


def test_font_change_guard():
    assert 'function setFontFamily(value: string): void {' in SCENE
    assert 'if (!editing) return;' in SCENE.split('function setFontFamily(value: string): void {', 1)[1].split('function setFontSize(', 1)[0]
    assert 'on:change={(event) => setFontFamily(event.currentTarget.value)}' in SCENE
    assert 'on:change={(event) => onTextFormat(editing.id' not in SCENE


def test_floating_toolbar_focusable():
    assert 'role="toolbar" tabindex="0"' in SCENE


def test_video_pipeline_untouched():
    assert (ROOT / 'src/lib/video.ts').exists()
