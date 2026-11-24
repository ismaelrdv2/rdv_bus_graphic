import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('src/App.svelte');
const rust=read('src-tauri/src/kdenlive.rs');
const native=read('src-tauri/src/lib.rs');
const bridge=read('src/lib/kdenlive.ts');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'0.1.0-alpha.9.3.20');
assert(app.includes("Produção · RDV Bus Studio"),'Painel Produção ausente');
assert(app.includes('videoFormat=KDENLIVE_OVERLAY_PRESET.format'),'Preset Kdenlive ausente');
assert(app.includes('KDENLIVE_OVERLAY_PRESET'));
assert(app.includes('prepareForKdenlive'));
assert(app.includes('await finishVideo(jobId);'));
assert(app.indexOf('await finishVideo(jobId);')<app.indexOf('await prepareKdenliveClip('),'O clipe deve ser preparado somente depois do video');
assert(app.includes('Vídeo exportado, mas falhou o arquivo Kdenlive'),'Falha do MLT nao pode apagar video');
assert(bridge.includes("format: 'mov-qtrle'"));
assert(bridge.includes("background: 'transparent'"));
assert(bridge.includes('quality: 2'));
assert(bridge.includes("invoke<string>('kdenlive_prepare_clip',options)"));
assert(native.includes('mod kdenlive;'));
assert(native.includes('kdenlive::prepare_clip('));
assert(native.includes('kdenlive_prepare_clip')&&native.includes('list_system_fonts')&&native.includes('production_bundle_zip'));
for(const fragment of [
 '<mlt LC_NUMERIC=', '<profile description=', '<chain id=', '<playlist id=',
 'frame_rate_num=', 'display_aspect_num=', 'let last = frames - 1',
 'escape_mlt_xml(', 'avformat', 'video.is_absolute()', 'video.is_file()',
 'OpenOptions::new()', 'rdv-kdenlive{suffix}-LEIA-ME.txt', 'Chroma Key: Basic',
 'fn escapes_xml_and_preserves_exact_frame_count()', 'fn portrait_profile()'
]) assert(rust.includes(fragment),'MLT Kdenlive incompleto: '+fragment);
assert(!rust.includes('Command::new'),'Nenhum shell deve ser chamado por arquivo MLT.');
console.log('Preset Kdenlive, XML MLT, paths seguros e tratamento de erros: OK.');
