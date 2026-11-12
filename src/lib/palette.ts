/** Paletas compartilhadas por todos os componentes gráficos; os valores são persistidos no JSON. */
import { BRAND } from './brand';
import type { HudElement, HudStyle, PaletteColors, PaletteId, ProjectPalette, TextColorKey, TextColorRole, TextColorGroup } from './types';

export const DEFAULT_COLORS: PaletteColors = {
  primary: BRAND.gold, secondary: BRAND.lilac, background: BRAND.purpleDeep,
};

export const PALETTE_PRESETS: ReadonlyArray<{ id: Exclude<PaletteId, 'custom'>; name: string; colors: PaletteColors }> = [
  { id: 'purple-gold', name: 'Roxo e dourado (RDV Bus)', colors: DEFAULT_COLORS },
  { id: 'blue-orange', name: 'Azul e laranja', colors: { primary: '#38B9FF', secondary: '#FF9C46', background: '#102A48' } },
  { id: 'green-yellow', name: 'Verde e amarelo', colors: { primary: '#60D987', secondary: '#F5DF60', background: '#142C24' } },
  { id: 'red-gold', name: 'Vermelho e dourado', colors: { primary: '#F36A7B', secondary: '#EBC36A', background: '#361422' } },
  { id: 'pink-cyan', name: 'Rosa e ciano', colors: { primary: '#ED7BC6', secondary: '#6BE3EF', background: '#2A143C' } },
];

export const DEFAULT_PALETTE: ProjectPalette = { preset: 'purple-gold', colors: DEFAULT_COLORS };

/** Aceita HTML hexadecimal #RGB/#RRGGBB ou rgb(R,G,B); rejeita valores fora de 0..255. */
export function parseColor(value: string): string | null {
  const raw = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(raw)) return '#' + [...raw.slice(1)].map(c => c+c).join('').toUpperCase();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  const m = raw.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!m) return null;
  const rgb = m.slice(1).map(Number);
  return rgb.every(v => v>=0 && v<=255) ? toHex(rgb[0],rgb[1],rgb[2]) : null;
}

export function toHex(r: number, g: number, b: number): string {
  const hex = (v:number)=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0').toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function toRgb(hex: string): [number, number, number] {
  const normalized = parseColor(hex) || DEFAULT_COLORS.primary;
  return [1,3,5].map(i => parseInt(normalized.slice(i,i+2),16)) as [number,number,number];
}

export function mixHex(a:string, b:string, portion:number):string {
  const first=toRgb(a), second=toRgb(b), t=Math.max(0,Math.min(1,portion));
  return toHex(...(first.map((n,i)=>n+(second[i]-n)*t) as [number,number,number]));
}

export function presetById(id: PaletteId) { return PALETTE_PRESETS.find(p=>p.id===id); }

export function palettePaint(style: HudStyle) {
  const primary = parseColor(style.accent)||DEFAULT_COLORS.primary;
  const secondary = parseColor(style.secondary||'')||DEFAULT_COLORS.secondary;
  const background = parseColor(style.background)||DEFAULT_COLORS.background;
  const classic = secondary===BRAND.lilac.toUpperCase() && background===BRAND.purpleDeep.toUpperCase();
  return {
    primary, secondary, background,
    edge: classic ? BRAND.purpleEdge : mixHex(secondary, background, .60),
    dark: classic ? BRAND.purpleDark : mixHex(background, '#000000', .35),
    muted: classic ? BRAND.muted : mixHex(secondary, '#FFFFFF', .25),
  };
}

/** Resolve a função de cada campo sem confundir o valor da ficha técnica com o texto auxiliar. */
export function textGroupFor(element: HudElement, key: TextColorKey): TextColorGroup {
  if (key === 'heading') return 'title';
  if (key === 'footer' || key.startsWith('caption')) return 'secondary';
  const technicalValues = element.kind === 'technical' || (element.kind === 'freeText' &&
    ['technicalBar', 'technicalAlpha1', 'fullTechnical'].includes(element.freeTextStyle || ''));
  if (key === 'line2' && !technicalValues) return 'secondary';
  return 'body';
}

/** Resolve prioridades: campo específico > grupo semântico > cor original do desenho. */
export function textColor(element: HudElement, key: TextColorKey, defaultRole: TextColorRole = 'white'): string {
  const fieldOverride = element.textColors?.[key];
  const groupOverride = element.textGroups?.[textGroupFor(element, key)] || 'original';
  const role = fieldOverride === 'original' ? defaultRole
    : fieldOverride || (groupOverride === 'original' ? defaultRole : groupOverride);
  const paint = palettePaint(element.style);
  if (role === 'primary') return paint.primary;
  if (role === 'secondary') return paint.secondary;
  if (role === 'white' && defaultRole === 'white' && (fieldOverride === 'original' || (!fieldOverride && groupOverride === 'original'))) return BRAND.text;
  return role === 'white' ? '#FFFFFF' : BRAND.text;
}

export function colorAsSelected(element: HudElement, key: TextColorKey): TextColorRole {
  return element.textColors?.[key] || 'original';
}

/** A seleção do grupo limpa apenas as exceções individuais daquele grupo. */
export function withTextGroupColor(element: HudElement, group: TextColorGroup, role: TextColorRole): HudElement {
  const overrides = { ...element.textColors };
  for (const key of Object.keys(overrides) as TextColorKey[]) {
    if (textGroupFor(element, key) === group) delete overrides[key];
  }
  return { ...element, textColors: overrides,
    textGroups: { ...element.textGroups, [group]: role } };
}

export function textGroupAsSelected(element: HudElement, group: TextColorGroup): TextColorRole {
  return element.textGroups?.[group] || 'original';
}
