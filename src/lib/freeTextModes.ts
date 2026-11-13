import type { FreeTextStyle, HudElement } from './types';

/** Os formatos removidos continuam reconhecidos na leitura de projetos antigos. */
export function canonicalFreeTextStyle(style:FreeTextStyle | undefined):FreeTextStyle {
  if(style==='legacyHalfBar'||style==='legacyFullBar')return 'legacyLabel';
  if(style==='legacyPresentationSlide')return 'fullPage';
  return style||'legacyLabel';
}
export function studioOnlyStyle(style:FreeTextStyle | undefined):boolean {
  return ['classic','technicalAlpha1','newsLabel','newsTicker','newsLowerThird','newsSlide'].includes(canonicalFreeTextStyle(style));
}
export type LabelBarSize = 'small'|'medium'|'large';
export function labelBarDimensions(size:LabelBarSize,canvasWidth:number):{width:number;height:number}{
  const dims=size==='large'?{width:1550,height:152}:size==='medium'?{width:960,height:128}:{width:550,height:102};
  return {width:Math.min(canvasWidth,dims.width),height:dims.height};
}
/** Largura estimada para autoajuste. A edição manual permanece independente. */
export function estimatedLabelWidth(element:HudElement,canvasWidth:number):number{
  const first=[...element.fields.line1.replace(/\s+/g,' ').trim()].length;
  const second=[...element.fields.line2.replace(/\s+/g,' ').trim()].length;
  const mode=element.freeTextDisplay||'both';
  const maxChars=mode==='first'?first:mode==='second'?second:Math.max(first,second);
  const font=element.style.fontSize*Math.sqrt(element.style.scaleX*element.style.scaleY);
  const social=element.freeTextIcon&&element.freeTextIcon!=='none'?105:38;
  return Math.min(canvasWidth,Math.max(220,Math.ceil(maxChars*font*.64+social+44)));
}
