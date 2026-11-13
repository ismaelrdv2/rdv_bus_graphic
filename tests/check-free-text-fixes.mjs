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

console.log('Texto Livre: ícones, títulos, edição direta e geometria: OK');
