import type { HudElement, TextFormatting, TextField } from './types';
import { fontStack } from './fonts';

export type EditableTextKey = TextField | `caption${number}`;

export function fieldTextStyle(element: HudElement, key: string): string | undefined {
  const f = element.textFormatting?.[key];
  if (!f) return undefined;
  const styles: string[] = [];
  if (typeof f.bold === 'boolean') styles.push(`font-weight:${f.bold ? '800' : '400'}`);
  if (typeof f.italic === 'boolean') styles.push(`font-style:${f.italic ? 'italic' : 'normal'}`);
  if (typeof f.underline === 'boolean') styles.push(`text-decoration:${f.underline ? 'underline' : 'none'}`);
  if (typeof f.family === 'string') styles.push(`font-family:${fontStack(f.family)}`);
  if (typeof f.size === 'number' && Number.isFinite(f.size)) styles.push(`font-size:${Math.max(9, Math.min(180, f.size))}px`);
  return styles.length ? styles.join(';') : undefined;
}

/** Seleções no corpo rico recebem marcação persistente, compatível com o renderizador SVG. */
export function wrapSelectedText(raw: string, start: number, end: number, mark: 'bold' | 'italic' | 'underline'): string {
  const left = Math.max(0, Math.min(raw.length, start));
  const right = Math.max(left, Math.min(raw.length, end));
  if (left === right) return raw;
  const marker = mark === 'bold' ? '**' : mark === 'italic' ? '*' : '__';
  const selected = raw.slice(left, right);
  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
    return raw.slice(0, left) + selected.slice(marker.length, -marker.length) + raw.slice(right);
  }
  return raw.slice(0, left) + marker + selected + marker + raw.slice(right);
}
