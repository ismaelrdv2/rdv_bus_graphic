import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shape=read('src/components/BroadcastShape.svelte');
const cases=['heading','line1','line2'];
for(const field of cases){
  const count=shape.split('data-edit-field="'+field+'"').length-1;
  assert(count>=3,'Edição direta do campo '+field+' incompleta');
}
assert(shape.includes('hasSocial =') && shape.includes('{#if hasSocial}'),
  'O ícone social deve aparecer em etiqueta Plantão, barra e Lower Third');
assert(shape.includes('reserveRight')&&shape.includes('iconSize'),
  'A área do ícone precisa de reserva para não encobrir os textos');
assert(shape.includes('badgeLines = splitBadgeTitle(headline)'),
  'O título longo da etiqueta deve permanecer legível na faixa lateral');

const app=read('src/App.svelte');
const preview=read('src/components/ScenePreview.svelte');
assert(app.includes("['legacyPresentationSlide','newsSlide'].includes"),
  'Slide Manchete precisa ser tratado como tela inteira ao editar');
assert(preview.includes("['legacyPresentationSlide','newsSlide'].includes"),
  'Slide Manchete não pode mostrar alças de redimensionamento');


const classicLabel=read('src/components/LegacyShape.svelte');
const studioLabel=read('src/components/HudShape.svelte');
const compact=read('src/lib/compactText.ts');
for(const variant of ['first','second','alternate']){
  assert(compact.includes("case '"+variant+"'"), 'Modo de texto ausente: '+variant);
}
for(const [name,renderer] of [['Clássico',classicLabel],['Studio',studioLabel]]){
  assert(renderer.includes("centeredCompactText"),name+' não identifica o modo de texto único');
  assert(renderer.includes("compactCenterX"),name+' não calcula o centro da área útil');
  assert((renderer.match(/text-anchor=\{centeredCompactText\?'middle':'start'\}/g)||[]).length===2,
    name+' precisa centralizar horizontalmente Texto 1 e Texto 2');
  assert((renderer.match(/dominant-baseline=\{centeredCompactText\?'middle':undefined\}/g)||[]).length===2,
    name+' precisa centralizar verticalmente Texto 1 e Texto 2');
}
assert(classicLabel.includes('rich.scrollLine1 && !centeredCompactText'),
  'Rolagem impede alinhamento central no modo somente Texto 1');
assert(classicLabel.includes('rich.scrollLine2 && !centeredCompactText'),
  'Rolagem impede alinhamento central no modo somente Texto 2');

console.log('Texto Livre: ícones, título, edição direta, centralização e geometria: OK');
