"""Regressão do editor Desktop com camadas e abas, sem exigir pacotes externos."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
def src(s):return (r/s).read_text()
app=src('src/App.svelte')
categories=src('src/lib/workspace.ts')
backend=src('src-tauri/src/lib.rs')
for kind in ['technical','location','date','route','driver','credit','freeText','slide','corner']:
    assert f"kind:'{kind}'" in categories, kind
assert "projectForCategory(project,activeCategory)" in app
assert "workspaceMode === 'tabs'" in app
assert 'Gerar desta aba' in app and 'Gerar todas as abas' in app
assert 'batchPreviewCategory = category.kind' in app
assert 'project={exportProject}' in app
assert 'await invoke<string>(\'batch_export_archive\'' in app
for command in ('batch_export_begin','batch_export_archive','batch_export_cancel'):
    assert f'fn {command}' in backend
    assert command in backend.split('tauri::generate_handler!')[-1]
assert 'io::copy(&mut input, &mut writer)' in backend
assert 'zip::CompressionMethod::Stored' in backend
print('Editor por categorias e ZIP de videos: integração estática OK')
