import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/App.svelte'),props=read('src/components/PropertiesPanel.svelte'),css=read('src/app.css');
assert.equal(JSON.parse(read('package.json')).version,'0.1.0-alpha.9.3.15');
assert(app.includes('production-rail-button'));
assert(app.includes('Produção · RDV Bus Studio'));
assert(app.includes('aria-label="Produção de vídeo, SVG e projeto"'));
for(const name of ['production-orientation','production-fps','production-duration',
 'Exportar quadro SVG','Salvar projeto JSON','Preset Kdenlive','video-format',
 'raster-quality','export-background','prepareForKdenlive','openOutputFolder'])
 assert(app.includes(name),'Funcao de Producao ausente: '+name);
assert(!app.includes('<span>Exportar vídeo</span>'));
assert(!app.includes('<span>Kdenlive</span>'));
const atContent=props.indexOf("{#if activeTab === 'content'}");
const atDimensions=props.indexOf("{:else if activeTab === 'dimensions'}");
assert(atContent>=0&&atDimensions>atContent);
const block=props.slice(atContent,atDimensions);
assert(block.includes("onTechnicalSide(event.currentTarget.value"));
assert(block.includes('Posição horizontal de {KIND_INFO[selected.kind].label}'));
assert(!props.slice(atDimensions).includes('Lado da faixa técnica'));
assert(!props.includes('aria-label="Configurações do projeto"'),'Video tab not removed');
assert(css.includes('.production-dialog')&&css.includes('.production-rail-button'));
console.log('Desktop Alpha 9.3.15: Produção centralizada e lado individual em todas as categorias OK.');
