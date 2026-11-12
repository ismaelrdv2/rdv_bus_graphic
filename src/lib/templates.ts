import type { AnimationStyle, ElementKind, HudElement, HudStyle, RDVProject, TextField } from './types';
import { APP_VERSION, DEFAULT_DURATION, SCHEMA_VERSION } from './types';
import { BRAND } from './brand';
import { DEFAULT_RICH_TEXT } from './richtext';

export const FIELD_LABELS: Record<ElementKind, Partial<Record<TextField, string>>> = {
  technical: { heading: 'Título', line1: 'Carroceria', line2: 'Modelo da carroceria', line3: 'Chassi', line4: 'Modelo do chassi', line5: 'Empresa', line6: 'Prefixo' },
  location: { heading: 'Título', line1: 'Endereço / local', line2: 'Cidade / UF' },
  date: { heading: 'Título', line1: 'Data', line2: 'Detalhes' },
  route: { heading: 'Título', line1: 'Linha', line2: 'Itinerário / cidade' },
  driver: { heading: 'Título', line1: 'Nome', line2: 'Detalhe' },
  credit: { heading: 'Título', line1: 'Nome / parceiro', line2: 'Detalhe' },
  freeText: { heading: 'Título', line1: 'Texto principal', line2: 'Texto secundário' },
  slide: { heading: 'Título', line1: 'Texto principal', line2: 'Texto complementar' },
  corner: { heading: 'Nome', line1: 'Legenda', line2: 'Descrição' },
};

export const KIND_INFO: Record<ElementKind, { label: string; description: string; icon: string }> = {
  technical: { label: 'Ficha técnica', description: 'Dados do ônibus', icon: 'clipboard' },
  location: { label: 'Localização', description: 'Local da gravação', icon: 'map-pin' },
  date: { label: 'Data', description: 'Quando foi gravado', icon: 'calendar' },
  route: { label: 'Linha de ônibus', description: 'Número e itinerário', icon: 'route' },
  driver: { label: 'Motorista', description: 'Identificação do motorista', icon: 'user' },
  credit: { label: 'Crédito', description: 'Filmagem e parceiros', icon: 'film' },
  freeText: { label: 'Texto livre', description: 'Mensagem personalizada', icon: 'type' },
  slide: { label: 'Slide', description: 'Cartela com movimento', icon: 'layout' },
  corner: { label: 'Imagem de canto', description: 'Logotipo ou imagem', icon: 'image' },
};

export const KINDS: ElementKind[] = ['technical', 'location', 'date', 'route', 'driver', 'credit', 'freeText', 'slide', 'corner'];

const baseStyle: HudStyle = {
  x: 74, y: 816, width: 850, fontSize: 50, fontFamily: 'Inter',
  accent: BRAND.gold, background: BRAND.purpleDeep, opacity: 100, scaleX: 1, scaleY: 1,
};

function uniqueId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `rdv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeElement(kind: ElementKind): HudElement {
  const fields: HudElement['fields'] = { heading: '', line1: '', line2: '', line3: '', line4: '', line5: '', line6: '' };
  let style: HudStyle = { ...baseStyle };
  let animation: AnimationStyle = 'legacy';

  switch (kind) {
    case 'technical':
      Object.assign(fields, { heading: 'FICHA TÉCNICA', line1: 'CAIO', line2: 'Millennium V', line3: 'Mercedes-Benz', line4: 'O-500M Bluetec 6', line5: 'BRT Amazônia', line6: 'B 692' });
      style = { ...style, x: 0, y: 0, width: 640, fontSize: 41 }; break;
    case 'location':
      Object.assign(fields, { heading: 'LOCALIZAÇÃO', line1: 'Avenida Almirante Barroso', line2: 'Belém • PA' }); break;
    case 'date':
      Object.assign(fields, { heading: 'DATA DA GRAVAÇÃO', line1: '11 de novembro de 2026', line2: 'Belém • PA' }); break;
    case 'route':
      Object.assign(fields, { heading: 'IDENTIFICAÇÃO DA LINHA', line1: '305 – ICOARACI', line2: 'Belém • Pará' }); break;
    case 'driver':
      Object.assign(fields, { heading: 'MOTORISTA', line1: 'Nome do motorista', line2: 'Identificação' }); break;
    case 'credit':
      Object.assign(fields, { heading: 'CRÉDITO DE FILMAGEM', line1: 'Imagens: RDV Bus', line2: 'Parceria e filmagem' });
      style = { ...style, x: 60, y: 926, width: 550, fontSize: 29 }; animation = 'legacy'; break;
    case 'freeText':
      Object.assign(fields, { heading: 'TEXTO LIVRE', line1: 'Sua mensagem aqui', line2: 'Texto personalizável' });
      style = { ...style, y: 816, width: 740, fontSize: 39 }; break;
    case 'slide':
      Object.assign(fields, { heading: 'DESTAQUE', line1: 'Uma viagem pela cidade', line2: 'RDV Bus apresenta' });
      style = { ...style, x: 110, y: 470, width: 1180, fontSize: 60 }; break;
    case 'corner':
      Object.assign(fields, { heading: 'IMAGEM DE CANTO', line1: 'Adicione uma imagem' });
      style = { ...style, x: 1580, y: 70, width: 260, fontSize: 26 };
      animation = 'fade'; break;
  }
  return {
    id: uniqueId(), kind, title: KIND_INFO[kind].label, visible: true, fields, style, animation, visualPreset: 'legacy',
    ...(kind === 'technical' ? { technicalSide: 'left' as const, technicalLayout: 'side' as const } : {}),
    ...(kind === 'freeText' ? {
      freeTextStyle: 'legacyLabel' as const,
      freeTextCaptions: ['CARROCERIA', 'MODELO', 'CHASSI', 'MODELO', 'EMPRESA', 'PREFIXO'],
      technicalSide: 'left' as const,
      richText: { ...DEFAULT_RICH_TEXT },
    } : {}),
  };
}

export function newProject(): RDVProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    id: uniqueId(),
    name: 'Meu projeto RDV Bus',
    createdAt: now,
    updatedAt: now,
    canvas: { width: 1920, height: 1080, fps: 60, duration: DEFAULT_DURATION },
    elements: [makeElement('route'), makeElement('credit')],
  };
}

export function duplicateElement(original: HudElement): HudElement {
  return {
    ...original,
    id: uniqueId(),
    title: `${original.title} (cópia)`,
    fields: { ...original.fields },
    ...(original.textFormatting ? { textFormatting: Object.fromEntries(Object.entries(original.textFormatting).map(([k,v]) => [k,{...v}])) } : {}),
    ...(original.technicalCaptions ? {technicalCaptions: [...original.technicalCaptions]} : {}),
    ...(original.richText ? {richText: {...original.richText}} : {}),
    ...(original.freeTextCaptions ? {freeTextCaptions: [...original.freeTextCaptions]} : {}),
    style: { ...original.style, x: Math.min(1850, original.style.x + 28), y: Math.min(1040, original.style.y + 28) },
  };
}
