import type { AnimationStyle } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function easeOutCubic(t: number): number {
  const value = clamp(t, 0, 1);
  return 1 - (1 - value) ** 3;
}

export interface SceneMotion {
  alpha:number;
  shiftX:number;
  /** Escala do Zoom de Estúdio: 0,82 → 1 → 0,82. */
  scale:number;
  /** Área visível para Cortina e Revelação Central: 0 → 1 → 0. */
  reveal:number;
}
export function motionAt(time: number, duration: number, animation: AnimationStyle): SceneMotion {
  if (animation === 'none' || animation === 'legacy')
    return { alpha:1, shiftX:0, scale:1, reveal:1 };
  const safeDuration = Math.max(.01,duration);
  const enterDuration = Math.min(.8, safeDuration / 3);
  const exitDuration = Math.min(.5, safeDuration / 3);
  const entering = easeOutCubic(time / enterDuration);
  const leaving = easeOutCubic((safeDuration - time) / exitDuration);
  const progress = clamp(Math.min(entering, leaving), 0, 1);
  return {
    alpha: animation === 'curtain' || animation === 'split' ? 1 : progress,
    shiftX: animation === 'slide' ? Math.round((1-progress)*-115) : 0,
    scale: animation === 'zoom' ? .82 + .18*progress : 1,
    reveal: animation === 'curtain' || animation === 'split' ? progress : 1
  };
}

/** Amostra o primeiro e o último quadro sem cortar a saída. */
export function exportFrameTime(index: number, frameCount: number, duration: number): number {
  if (frameCount <= 1) return 0;
  return clamp(index / (frameCount - 1), 0, 1) * duration;
}
