import type { CompactTextDisplay } from './types';

/** Mantém o conteúdo salvo, mas apresenta etiquetas compactas em uma única linha. */
export function singleLineText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

/** Troca entre textos com dissolvência breve sem interromper a animação do elemento. */
export function compactTextWeights(mode: CompactTextDisplay | undefined, time: number, duration: number): { first: number; second: number; stacked: boolean } {
  switch (mode) {
    case 'first': return { first: 1, second: 0, stacked: false };
    case 'second': return { first: 0, second: 1, stacked: false };
    case 'alternate': {
      const middle = Math.max(.05, duration) / 2;
      const transition = Math.min(.22, Math.max(.07, duration * .05));
      const t = Math.max(0, Math.min(1, (time - middle + transition / 2) / transition));
      return { first: 1-t, second: t, stacked: false };
    }
    default: return { first: 1, second: 1, stacked: true };
  }
}
