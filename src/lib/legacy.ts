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


/**
 * Transcrição das curvas de entrada do rdv_anim.py (pacote gráfico v6).
 * Os tempos são segundos, relativos ao início da sequência (não percentuais).
 * Animação determinística: a mesma função serve ao preview e a cada quadro exportado.
 */
export function legacyLabelMotion(phase: number) {
  const panel = easeOutCubic(phase / 0.40);
  const gold = easeOutCubic((phase - 0.10) / 0.45);
  const iconProgress = clamp((phase - 0.28) / 0.35, 0, 1);
  const overshoot = 1 + 2.5 * (iconProgress - 1) ** 3 + 1.5 * (iconProgress - 1) ** 2;
  return {
    panel,
    gold,
    iconScale: 0.55 + 0.45 * overshoot,
    iconOpacity: clamp((phase - 0.28) / 0.14, 0, 1),
    label: easeOutCubic((phase - 0.38) / 0.30),
    value: easeOutCubic((phase - 0.46) / 0.34),
  };
}

/** RDV v6: 0,55 s de painel + 90 ms por campo + 0,40 s para o último campo. */
export function legacyTechnicalEntrance(visibleFields: number): number {
  const count = Math.max(1, Math.min(8, Math.round(visibleFields)));
  return 0.55 + 0.09 * count + 0.40;
}

/** Logo de canto do RDV v6: escala de 86% a 100% e deslocamento lateral de 30 px. */
export function legacyCornerMotion(phase: number) {
  const reveal = easeOutCubic(phase / 0.55);
  return { opacity: reveal, scale: 0.86 + 0.14 * reveal, offset: 30 * (1 - reveal) };
}
