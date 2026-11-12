"""Verificações básicas sem dependências de npm ou Rust.

Execute: python3 tests/test_package.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_configurations():
    for relative in ('package.json', 'tsconfig.json', 'src-tauri/tauri.conf.json', 'src-tauri/capabilities/default.json'):
        value = json.loads((ROOT / relative).read_text(encoding='utf-8'))
        assert isinstance(value, dict), relative
    pkg = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    tauri = json.loads((ROOT / 'src-tauri/tauri.conf.json').read_text(encoding='utf-8'))
    assert pkg['version'] == tauri['version'] == '0.1.0-alpha.9.3.1'
    assert '0.1.0-alpha.9.3.1' in (ROOT / 'src-tauri/Cargo.toml').read_text(encoding='utf-8')
    assert tauri['build']['frontendDist'] == '../dist'
    assert tauri['build']['devUrl'] == 'http://127.0.0.1:1420'


def test_changelog_and_identity():
    pkg = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    version = pkg['version']
    types = (ROOT / 'src/lib/types.ts').read_text(encoding='utf-8')
    changelog = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
    assert f"APP_VERSION = '{version}'" in types
    assert f'## {version} ' in changelog
    assert (ROOT / 'docs/IDENTIDADE_VISUAL.md').is_file()
    assert (ROOT / 'src/lib/video.ts').is_file()
    assert 'supersampled.width = width * quality' in (ROOT / 'src/lib/video.ts').read_text(encoding='utf-8')
    app = (ROOT / 'src/App.svelte').read_text(encoding='utf-8')
    assert 'exportFrameTime(index, frames, project.canvas.duration)' in app
    assert 'exportFrameSvg(svg, project.canvas.width * rasterQuality, project.canvas.height * rasterQuality)' in app
    assert 'video_begin' in (ROOT / 'src-tauri/src/lib.rs').read_text(encoding='utf-8')
    shape = (ROOT / 'src/components/HudShape.svelte').read_text(encoding='utf-8')
    preview = (ROOT / 'src/components/ScenePreview.svelte').read_text(encoding='utf-8')
    assert 'technicalAlpha1' in shape and 'isBar(element)' in shape
    assert 'technicalBar' in (ROOT / 'src/lib/geometry.ts').read_text(encoding='utf-8')
    assert 'onResize' in preview and 'beginResize' in preview
    assert 'scaleX' in (ROOT / 'src/lib/validation.ts').read_text(encoding='utf-8')
    assert (ROOT / 'src/lib/geometry.ts').is_file()
    templates = (ROOT / 'src/lib/templates.ts').read_text(encoding='utf-8')
    assert "'slide'" in templates
    for name in ('line1', 'line2', 'line3', 'line4', 'line5', 'line6'):
        assert name in templates


def test_assets():
    for relative in ('src/App.svelte', 'src/app.css', 'src/lib/validation.ts',
                     'src/components/ScenePreview.svelte', 'src/components/Timeline.svelte',
                     'src-tauri/icons/icon.png', 'src-tauri/icons/icon.ico'):
        assert (ROOT / relative).is_file(), relative
        assert (ROOT / relative).stat().st_size > 100, relative


def test_no_external_code():
    # O editor não injeta bibliotecas JS/CDNs não incluídas pelo empacotador.
    for file in (ROOT / 'src').rglob('*'):
        if file.suffix not in {'.svelte', '.ts', '.css'}:
            continue
        data = file.read_text(encoding='utf-8')
        assert '<script src="http' not in data, file


def test_frame_export_ends():
    # Equivalente aritmético puro da fórmula JS em src/lib/timing.ts.
    for fps, duration in ((30, 5.3), (60, 5.3), (60, 1), (30, 30)):
        n = round(fps * duration)
        frames = [i / (n - 1) * duration for i in range(n)]
        assert frames[0] == 0
        assert frames[-1] == duration
        assert all(a < b for a,b in zip(frames,frames[1:]))


# Regression guard: maintain 4-argument calls required by MeasureRich and labeled progress UI.
def test_alpha7_1_svelte_fixes():
    shape = (ROOT / 'src/components/LegacyShape.svelte').read_text(encoding='utf-8')
    app = (ROOT / 'src/App.svelte').read_text(encoding='utf-8')
    for expected in (
        'measure(line1Text, typeSize, true, false)',
        'measure(line2Text, typeSize*.68, false, false)',
        'measure(text, wanted, bold, false)',
    ):
        assert expected in shape, expected
    assert '<label for="export-progress">' in app
    assert '<progress id="export-progress"' in app

if __name__ == '__main__':
    test_configurations()
    test_assets()
    test_changelog_and_identity()
    test_no_external_code()
    test_frame_export_ends()
    test_alpha7_1_svelte_fixes()
    print('OK: configurações, versões, identidade, regressões Svelte e recursos essenciais')
