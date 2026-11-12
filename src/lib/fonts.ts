export const DEFAULT_FONT = 'Inter';
export const FALLBACK_FONTS = ['Inter', 'Arial', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans', 'sans-serif', 'serif', 'monospace'];

/** Apenas nomes de famílias. Sem caminhos, URLs ou código CSS. */
export function normalizeFontName(input: unknown, fallback = DEFAULT_FONT): string {
  if (typeof input !== 'string') return fallback;
  const value = input.trim();
  if (value.length < 1 || value.length > 100 || /[\x00-\x1f\x7f<>;{}\\]/.test(value)) return fallback;
  return value;
}

/** Valor CSS quoted, evitando injeção de declarações via nome da fonte. */
export function fontStack(family: string | undefined): string {
  const normalized = normalizeFontName(family);
  if (['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(normalized)) return normalized;
  return `${JSON.stringify(normalized)}, Arial, sans-serif`;
}

