import type { ElementKind, RDVProject } from './types';

export type WorkspaceMode = 'layers' | 'tabs';
export const WORKSPACE_CATEGORIES: ReadonlyArray<{ kind: ElementKind; label: string; folder: string }> = [
  {kind:'technical',label:'Ficha técnica',folder:'01_ficha_tecnica'},
  {kind:'location',label:'Localização',folder:'02_localizacao'},
  {kind:'date',label:'Data',folder:'03_data'},
  {kind:'route',label:'Linha de ônibus',folder:'04_linha_onibus'},
  {kind:'driver',label:'Motorista',folder:'05_motorista'},
  {kind:'credit',label:'Crédito de filmagem',folder:'06_credito_filmagem'},
  {kind:'freeText',label:'Texto livre',folder:'07_texto_livre'},
  {kind:'slide',label:'Slide',folder:'08_slide'},
  {kind:'corner',label:'Imagem de canto',folder:'09_imagem_canto'},
];

export function projectForCategory(project: RDVProject, kind: ElementKind): RDVProject {
  return {...project, elements:project.elements.filter(element=>element.kind===kind)};
}
export function populatedCategories(project: RDVProject) {
  return WORKSPACE_CATEGORIES.filter(category=>project.elements.some(element=>element.kind===category.kind && element.visible));
}
