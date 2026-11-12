/** Efeitos determinísticos por quadro; partilhados pela prévia e pelos vídeos. */
import { clamp } from './timing';
export type ShineKind = 'card' | 'bar' | 'full';
export function shineFrame(time:number,duration:number,kind:ShineKind) {
  const start=Math.min(kind==='full'?1.60:kind==='bar'?1.35:.55,Math.max(.12,duration*.28));
  const length=Math.min(kind==='full'?1.10:kind==='bar'?.90:.60,Math.max(.08,duration-start-.14));
  const progress=clamp((time-start)/length,0,1);
  const visible=time>=start && time<start+length && time<duration-.08;
  const peak=kind==='full'?.10:kind==='bar'?.16:.19;
  return {visible,progress,strength:visible?peak*Math.sin(Math.PI*progress):0};
}
