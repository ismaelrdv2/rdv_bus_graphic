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
  return right ? width - 64 : technicalPanelBoundary(width, height, y, false) - 24;
}

/** Dá à barra da direita mais área útil sem encostar os chevrons na diagonal. */
export function technicalTextX(right: boolean): number {
  return right ? 118 : 92;
}
