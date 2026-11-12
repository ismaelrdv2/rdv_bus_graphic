/** Geometria do painel técnico clássico; valores em coordenadas SVG locais. */
import { clamp } from './timing';

/** A diagonal tem recuo de 84 px no topo (direita) ou na base (esquerda). */
export const TECHNICAL_DIAGONAL = 84;

/** Posição do limite interno da barra na altura indicada. */
export function technicalPanelBoundary(width: number, height: number, y: number, right: boolean): number {
  const progress = clamp(y / Math.max(1, height), 0, 1);
  return right ? TECHNICAL_DIAGONAL * (1 - progress)
    : width - TECHNICAL_DIAGONAL + TECHNICAL_DIAGONAL * progress;
}

/** Termina a linha antes da borda, mesmo quando esta é diagonal. */
export function technicalSeparatorEnd(width: number, height: number, y: number, right: boolean): number {
  return right ? technicalTextRightEdge(width, true) : technicalPanelBoundary(width, height, y, false) - 24;
}

/** Dá à barra da direita mais área útil sem encostar os chevrons na diagonal. */
export function technicalTextX(right: boolean): number {
  return right ? 118 : 92;
}

/** Limite de leitura: margem direita ampliada para não encostar nos contornos. */
export const RIGHT_TECHNICAL_GUTTER = 118;
export function technicalTextRightEdge(width: number, right: boolean): number {
  return width - (right ? RIGHT_TECHNICAL_GUTTER : 50);
}

// A borda inclinada da ficha direita recua 84 px de cima para baixo.
// O início de cada linha deve acompanhar esse limite, não ficar em um x fixo.
export const RIGHT_TECHNICAL_TEXT_PADDING = 84;
/** Início dinâmico dos textos da ficha, mantendo distância constante da diagonal. */
export function technicalRowTextX(width: number, height: number, y: number, right: boolean): number {
  if (!right) return technicalTextX(false);
  const leftBoundary = technicalPanelBoundary(width, height, y, true);
  const rightEdge = technicalTextRightEdge(width, true);
  return clamp(leftBoundary + RIGHT_TECHNICAL_TEXT_PADDING, 70, Math.max(70, rightEdge - 240));
}
/** Espaço real até a borda direita, incluindo respiro de 14 px nas letras. */
export function technicalTextAvailableWidth(width: number, height: number, y: number, right: boolean): number {
  const start = technicalRowTextX(width, height, y, right);
  const rightEdge = technicalTextRightEdge(width, right);
  return Math.max(36, rightEdge - start - 14);
}
