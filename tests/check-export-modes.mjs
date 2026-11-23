import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const video = read('src/lib/video.ts');
const app = read('src/App.svelte');
const native = read('src-tauri/src/lib.rs');

for (const format of ['mov-qtrle','mov-prores','mkv-ffv1','webm-vp9'])
  assert(video.includes(format) && native.includes(format), 'Formato alfa removido: '+format);
assert(video.includes("'mp4-h264'"), 'Preset MP4 ausente');
assert(native.includes('"mp4-h264" => Some(("mp4"'), 'Backend FFmpeg não reconhece MP4');
assert(native.includes('"libx264"') && native.includes('"yuv420p"'), 'Codificação H.264 inválida');
assert(video.includes("green:'#00ff00'") && video.includes("blue:'#0000ff'"), 'Cor Chroma Key divergente');
assert(video.includes("background !== 'transparent'"), 'Ramo de composição alfa incorreto');
assert(video.includes("getContext('2d', { alpha: background === 'transparent' })"));
assert(app.includes('value="green"') && app.includes('value="blue"'), 'Opções Chroma Key ausentes');
assert(app.includes("disabled={videoFormat==='mp4-h264'}"), 'MP4 não deve permitir alfa');
assert(app.includes('effectiveBackground'), 'MP4 deve ter fundo opaco mesmo durante troca de preset');
console.log('Contratos da exportação Desktop (alfa nativo e MP4/Chroma Key): OK.');
