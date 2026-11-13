/** Motor temporal independente do desenho (Studio / Clássico).
 * Mantém a animação v6 aprovada; transições futuras podem ser adicionadas aqui,
 * sem duplicar a geometria dos renderizadores.
 */
import type { AnimationStyle } from './types';
import { legacyLabelMotion, legacyCornerMotion, legacyPhase, legacyStage, legacyTechnicalEntrance } from './legacy';

export interface VisualMotionFrame {
  active: boolean;
  panel: number;
  title: number;
  gold: number;
  value: number;
  iconOpacity: number;
  iconScale: number;
  rows: number[];
  corner: { opacity: number; scale: number; offset: number };
}

export function visualMotionFrame(
  animation: AnimationStyle,
  time: number,
  duration: number,
  variant: 'label' | 'technical' | 'fullscreen' | 'corner',
  visibleFields = 0,
): VisualMotionFrame {
  const rows = Math.max(1, Math.min(8, Math.round(visibleFields) || 1));
  if (animation !== 'legacy') {
    return {active:false,panel:1,title:1,gold:1,value:1,iconOpacity:1,iconScale:1,
      rows:Array(8).fill(1),corner:{opacity:1,scale:1,offset:0}};
  }
  const technical = variant === 'technical' || variant === 'fullscreen';
  const entrance = technical ? legacyTechnicalEntrance(rows) : variant === 'corner' ? .65 : .80;
  const exit = technical ? .60 : variant === 'corner' ? .45 : .50;
  const phase = legacyPhase(time,duration,entrance,exit);
  const label = legacyLabelMotion(phase);
  const corner = legacyCornerMotion(phase);
  return {
    active:true,
    panel: technical ? legacyStage(phase,0,.55) : variant === 'corner' ? corner.opacity : label.panel,
    title: technical ? legacyStage(phase,.40,.30) : label.label,
    gold: technical ? legacyStage(phase,.50,.40) : label.gold,
    value: technical ? legacyStage(phase,.55,.32) : label.value,
    iconOpacity:label.iconOpacity,
    iconScale:label.iconScale,
    rows:Array.from({length:8},(_,i)=>legacyStage(phase,.55+.09*i,.32)),
    corner,
  };
}
