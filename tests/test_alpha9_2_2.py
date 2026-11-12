"""Regressões para texto clássico e diretório de saída (alpha.9.2.2)."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
LEGACY = (ROOT/'src/components/LegacyShape.svelte').read_text()
APP = (ROOT/'src/App.svelte').read_text()
RUST = (ROOT/'src-tauri/src/lib.rs').read_text()
OUTPUT = (ROOT/'src/lib/output.ts').read_text()
VIDEO = (ROOT/'src/lib/video.ts').read_text()
PROJECTS = (ROOT/'src/lib/projects.ts').read_text()

def test_slide_baseline_stays_below_clip():
    assert 'slideClipTop + bodyFontSize * 1.05 + 8' in LEGACY
    assert 'y={slideBodyBaseline + i*bodyLayout.lineHeight}' in LEGACY
    assert 'y={slideClipTop}' in LEGACY
    assert 'x={margin+65} y={portrait?235:185}' in LEGACY

def test_bar_body_clears_divider():
    assert 'barBodyBaseline = Math.max(h*.66, h*.39 + bodyFontSize*1.16)' in LEGACY
    assert 'y={barBodyBaseline+i*bodyLayout.lineHeight}' in LEGACY

def test_svg_preserves_text_spaces():
    assert LEGACY.count('xml:space="preserve"') == 2
    assert "node.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');" in VIDEO

def test_default_folder_and_command():
    assert 'PathBuf::from(home).join("RDV Bus Studio")' in RUST
    assert 'fs::create_dir_all(&path)' in RUST
    assert 'desktop_default_output_directory' in RUST
    assert 'desktop_open_output_directory' in RUST
    assert 'Command::new("xdg-open")' in RUST
    assert 'Command::new("explorer.exe")' in RUST

def test_exports_and_projects_share_output_directory():
    assert 'joinOutputPath(await getOutputDirectory(), suggestedName)' in PROJECTS
    assert 'joinOutputPath(await getOutputDirectory(), name)' in APP
    assert 'joinOutputPath(await getOutputDirectory(), `${cleanName}.${preset.ext}`)' in APP
    assert 'Abrir pasta de saída' in APP
    assert 'rememberOutputFile(output)' in APP
    assert 'rememberOutputFile(path)' in APP
    assert 'localStorage.setItem(KEY, directory)' in OUTPUT
