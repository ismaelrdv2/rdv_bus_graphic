import type { AnimationStyle } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function easeOutCubic(t: number): number {
  const value = clamp(t, 0, 1);
  return 1 - (1 - value) ** 3;
}

export function motionAt(time: number, duration: number, animation: AnimationStyle): { alpha: number; shiftX: number } {
  if (animation === 'none' || animation === 'legacy') return { alpha: 1, shiftX: 0 };
  const enterDuration = Math.min(0.8, duration / 3);
  const exitDuration = Math.min(0.5, duration / 3);
  const entering = easeOutCubic(time / enterDuration);
  const leaving = easeOutCubic((duration - time) / exitDuration);
  const progress = clamp(Math.min(entering, leaving), 0, 1);
  return {
    alpha: progress,
    shiftX: animation === 'slide' ? Math.round((1 - progress) * -115) : 0,
  };
}

/**
 * Amostragem de quadros de exportação: os extremos de 0 e `duration` devem estar
 * incluídos (último quadro totalmente fora da cena). O vídeo mantém a duração
 * exata porque o FFmpeg recebe `frames` quadros a `fps` fixo.
 * O pequeno ajuste temporal entre quadros evita cortar a curva de saída.
 */
export function exportFrameTime(index: number, frameCount: number, duration: number): number {
  if (frameCount <= 1) return 0;
  return clamp(index / (frameCount - 1), 0, 1) * duration;
}
