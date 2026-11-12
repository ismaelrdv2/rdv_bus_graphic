/** Comportamentos recuperados do RDV Bus 0.14.1-rev3.
 * Curvas locais por camada. O último instante termina totalmente transparente.
 * O legado usa tempos absolutos aproximados .8/.5s; a apresentação de ficha
 * distribui seis campos até ~1.4s e depois inverte a sequência na saída.
 */
import { clamp, easeOutCubic } from './timing';

export function legacyPhase(time: number, duration: number, entrance = 0.8, exit = 0.5): number {
  const d = Math.max(0.05, duration);
  const out = Math.min(exit, d * .25);
  const entering = Math.min(entrance, d * .65);
  if (time >= d) return 0;
  if (time <= 0) return 0;
  if (time < d - out) return Math.min(time, entering) * (entrance / entering);
  return entrance * clamp((d - time) / out, 0, 1);
}
export function legacyStage(phase: number, start: number, length: number): number {
  return easeOutCubic((phase - start) / Math.max(.001, length));
}
export function legacyScrollDistance(time: number, speed: number): number {
  return Math.max(0, time - .5) * clamp(speed, 30, 1400);
}
export function legacyScrollTravel(width: number, textWidth: number, repeats: number, gap: number): number {
  const n = Math.max(1, Math.round(repeats));
  return width + n * textWidth + (n - 1) * gap;
}
export function legacyScrollRecommendedDuration(width: number, textWidth: number, speed: number, repeats: number, gap = 240): number {
  return .5 + legacyScrollTravel(width, textWidth, repeats, gap) / clamp(speed, 30, 1400) + .5;
}
