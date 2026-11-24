import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/App.svelte');
const props=read('src/components/PropertiesPanel.svelte');
const validate=read('src/lib/validation.ts');
const native=read('src-tauri/src/lib.rs');
const zip=read('src-tauri/src/production_zip.rs');
assert.equal(JSON.parse(read('package.json')).version,'0.1.0-alpha.9.3.15');
for(const k of ['technical','route','date','location','credit','driver','freeText'])
 assert(app.includes("kind:'"+k+"'"),'Etapa ausente: '+k);
assert(app.indexOf("kind:'technical'")<app.indexOf("kind:'route'"));
assert(app.indexOf("kind:'location'")<app.indexOf("kind:'credit'"));
for(const fragment of [
 'wizard-desktop-bar','goWizardStep(', 'addWizardLocation(',
 'choosePhotoWizard(', 'chooseFilmWizard(',
 'productionMode', 'Manual · categoria selecionada', 'Passo a passo · ZIP',
 'productionIncluded!==false', 'productionDuration', 'production_bundle_zip',
 'production_stage_create','production_stage_cleanup','snapshotForElement(',
 'collectWizardElements()', 'renderVideoFile(', 'produceWizardZip()',
 "productionMode==='wizard'?produceWizardZip():exportVideo()"
])assert(app.includes(fragment),'Wizard desktop incompleto: '+fragment);
assert(props.includes('onProductionDuration'));
assert(props.includes('onProductionIncluded'));
assert(props.includes('onPhotoCredit'));
assert(props.includes('Duração do vídeo desta categoria'));
assert(props.includes('Subcategoria de crédito'));
assert(validate.includes("productionIncluded:item.productionIncluded!==false"));
assert(validate.includes("productionRole:'photoCredit'"));
for(const name of ['production_bundle_zip','production_stage_create','production_stage_cleanup'])
 assert(native.includes(name),'Comando nativo ausente: '+name);
assert(zip.includes('create_new(true)'),'ZIP deve evitar sobrescrever arquivo do usuário');
assert(zip.includes('src=stage.join')||zip.includes('let source=stage.join'));
assert(zip.includes('canonical.parent()!=Some(stage.as_path())'));
assert(zip.includes('archive_roundtrip_headers'));
assert(!zip.includes('Command::new'));
console.log('Desktop Alpha 9.3.14: wizard, duração e ZIP nativo seguros: OK.');
