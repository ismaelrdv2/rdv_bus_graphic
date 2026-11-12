import { isTauri, invoke } from '@tauri-apps/api/core';
import { FALLBACK_FONTS, normalizeFontName } from './fonts';

export async function getSystemFontFamilies(): Promise<string[]> {
  if (!isTauri()) return [...FALLBACK_FONTS];
  try {
    const fonts = await invoke<string[]>('list_system_fonts');
    const installed = fonts.map((f: string) => normalizeFontName(f, '')).filter(Boolean);
    if (!installed.length) return [...FALLBACK_FONTS];
    return Array.from(new Set([...installed, 'sans-serif', 'serif', 'monospace']))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  } catch {
    return [...FALLBACK_FONTS];
  }
}
