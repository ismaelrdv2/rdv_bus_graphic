import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const code=ts.transpileModule(read('src/lib/updateCheck.ts'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const exports={};
const run=vm.runInNewContext('(function(require,exports){'+code+'})',{URL}, {timeout:1500});
run(()=>{throw Error('Runtime sem dependências externas')},exports);
const {compareVersions,desktopUpdateFromReleases,mobileUpdateFromFeed,checkPublishedUpdates}=exports;
for(const [a,b,want] of [
  ['0.1.0-alpha.9.3.10','0.1.0-alpha.9.3.9',1],
  ['0.1.0-alpha.9.3.9','0.1.0-alpha.9.3.9',0],
  ['0.1.0-alpha.3.8','0.1.0-alpha.3.7',1],
  ['0.1.0','0.1.0-alpha.3.8',1],
  ['0.1.0-alpha.3.8','0.1.0',-1],
  ['v0.1.0-alpha.3.9','0.1.0-alpha.3.8',1],
  ['0.1.0-alpha.3.8','0.1.0-alpha.3.9',-1]
]) assert.equal(compareVersions(a,b),want,a);
assert(Number.isNaN(compareVersions('yesterday','0.1.0')));
const desktopRelease=(tag,platform)=>({
 tag_name:tag,html_url:'https://github.com/ismaelrdv2/rdv_bus_graphic/releases/tag/'+tag,
 draft:false,published_at:'2026-11-13T12:00:00Z',body:'Mudanças',
 assets:[{name:platform==='windows'?'RDV-Bus-Studio-setup.exe':'RDV-Bus-Studio.AppImage',
  browser_download_url:'https://github.com/ismaelrdv2/rdv_bus_graphic/releases/download/'+tag+'/'+(platform==='windows'?'setup.exe':'RDV-Bus-Studio.AppImage')}]
});
const old='0.1.0-alpha.9.3.9',next='0.1.0-alpha.9.3.10';
assert.equal(desktopUpdateFromReleases([],old,'Linux').status,'unpublished');
assert.equal(desktopUpdateFromReleases([desktopRelease('v'+old,'linux')],old,'Linux').status,'current');
assert.equal(desktopUpdateFromReleases([desktopRelease('v'+next,'linux')],old,'Linux').status,'available');
assert.equal(desktopUpdateFromReleases([desktopRelease('v'+next,'windows')],old,'Windows NT').status,'available');
assert.equal(desktopUpdateFromReleases([desktopRelease('v'+next,'linux')],old,'Windows NT').status,'unpublished');
assert.equal(desktopUpdateFromReleases([{...desktopRelease('v'+next,'linux'),draft:true}],old,'Linux').status,'unpublished');
assert.equal(desktopUpdateFromReleases([{...desktopRelease('v'+next,'linux'),html_url:'https://evil.example/releases/tag/a'}],old,'Linux').status,'unpublished');
assert.equal(desktopUpdateFromReleases([{...desktopRelease('v'+next,'linux'),assets:[]}],old,'Linux').status,'unpublished');
const mobile={schema:1,release:{
 version:'0.1.0-alpha.3.9',url:'https://github.com/ismaelrdv2/RDV-Bus-Studio-Mobile/releases/tag/v0.1.0-alpha.3.9',
 notes:'APK assinado',publishedAt:'2026-11-13'}};
assert.equal(mobileUpdateFromFeed({release:null},'0.1.0-alpha.3.8').status,'unpublished');
assert.equal(mobileUpdateFromFeed(mobile,'0.1.0-alpha.3.8').status,'available');
assert.equal(mobileUpdateFromFeed(mobile,'0.1.0-alpha.3.9').status,'current');
assert.equal(mobileUpdateFromFeed({...mobile,release:{...mobile.release,url:'https://invalid.example/download.apk'}},'0.1.0-alpha.3.8').status,'unpublished');
const ui=read('src/components/UpdateCenter.svelte');
assert(ui.includes("onMount(()=>{void verify(false);})"),'Verificação automática ao iniciar');
assert(ui.includes('on:click={()=>{opened=true;void verify(true);}}'),'Verificação manual');
assert(ui.includes('href={release.url}'),'Botão oficial da versão');
assert(ui.includes('Não desinstale o aplicativo atual'),'Orientação sobre preservação de dados');
const desktop=read('src/App.svelte');
assert(desktop.includes('<UpdateCenter platform=')&&!desktop.includes('autoDeletePreviousVersion'));
console.log('Comparação SemVer, release seguro, aviso e preservação de dados: OK');
