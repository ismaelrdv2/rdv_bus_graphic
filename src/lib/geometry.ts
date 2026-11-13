import type { HudElement } from './types';
import { clamp } from './timing';

export const PORTRAIT_BAR_HEIGHT = 650;
/** Dimensões de referência da cartela de crédito de filmagem (Full HD 16:9). */
export const CREDIT_CARD_WIDTH = 550;
export const CREDIT_CARD_HEIGHT = 102;
export const CREDIT_CARD_FONT_SIZE = 29;
/** Apenas cartelas compactas: telas inteiras, slides, barras e logotipos mantêm layout próprio. */
export function isCompactCartela(element: HudElement): boolean {
  return ['location','date','route','driver','credit'].includes(element.kind)
    || (element.kind === 'freeText' && ['legacyLabel','newsLabel'].includes(element.freeTextStyle || ''));
}
/** Padroniza largura, altura e fonte mantendo conteúdo, cores e animações personalizados. */
export function standardizeCard(element: HudElement, canvasWidth: number, canvasHeight: number): HudElement {
  if (!isCompactCartela(element)) return element;
  const newHeightScale = CREDIT_CARD_HEIGHT / elementBaseHeight(element, canvasHeight);
  return {...element, style:{...element.style,
    width: CREDIT_CARD_WIDTH, fontSize: CREDIT_CARD_FONT_SIZE,
    scaleX: 1, scaleY: newHeightScale,
    x: Math.max(0, Math.min(element.style.x, canvasWidth-CREDIT_CARD_WIDTH)),
    y: Math.max(0, Math.min(element.style.y, canvasHeight-CREDIT_CARD_HEIGHT)) }};
}

export function isBottomBar(element: HudElement, canvasWidth: number, canvasHeight: number): boolean {
  return canvasHeight > canvasWidth && isBar(element);
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Dimensão base da arte. A escala de cada elemento é aplicada pelo grupo SVG. */
export function elementBaseHeight(element: HudElement, canvasHeight: number): number {
  if (element.kind === 'technical') return isBar(element) && canvasHeight > 1080 ? PORTRAIT_BAR_HEIGHT : canvasHeight;
  if (element.kind === 'freeText') {
    if (element.freeTextStyle === 'technicalBar') return canvasHeight > 1080 ? PORTRAIT_BAR_HEIGHT : canvasHeight;
    if (['fullTechnical', 'fullPage', 'legacyPresentationSlide', 'newsSlide'].includes(element.freeTextStyle || '')) return canvasHeight;
    if (element.freeTextStyle === 'newsTicker') return 138;
    if (element.freeTextStyle === 'newsLowerThird') return 205;
    if (element.freeTextStyle === 'newsLabel') return CREDIT_CARD_HEIGHT;
    if (element.freeTextStyle === 'technicalAlpha1') return 480;
    if (element.freeTextStyle === 'legacyPresentationBar') return 222;
    if (element.freeTextStyle === 'legacyLabel') {
      if(element.richText?.scrollLine1||element.richText?.scrollLine2){
        return element.scrollBarSize==='large'?152:element.scrollBarSize==='medium'?128:CREDIT_CARD_HEIGHT;
      }
      return CREDIT_CARD_HEIGHT;
    }
    if (['legacyHalfBar','legacyFullBar'].includes(element.freeTextStyle || '')) return 128;
    return 165;
  }
  if (['location','date','route','driver','credit'].includes(element.kind)) return CREDIT_CARD_HEIGHT;
  if (element.kind === 'corner') return 175;
  if (element.kind === 'slide') return 212;
  return 150;
}

export function isBar(element: HudElement): boolean {
  return (element.kind === 'technical' && element.technicalLayout !== 'fullscreen' && element.technicalLayout !== 'legacyFullscreen') || (element.kind === 'freeText' && element.freeTextStyle === 'technicalBar');
}

export interface ElementBounds { x: number; y: number; width: number; height: number }
export function boundsOf(element: HudElement, canvasHeight: number): ElementBounds {
  return {
    x: element.style.x, y: element.style.y,
    width: element.style.width * element.style.scaleX,
    height: elementBaseHeight(element, canvasHeight) * element.style.scaleY,
  };
}

/** Redimensiona por borda/canto fixando a borda oposta (Shift mantém proporção). */
export function resizeBounds(
  initial: ElementBounds, handle: ResizeHandle, dx: number, dy: number,
  canvasWidth: number, canvasHeight: number, proportional: boolean,
): ElementBounds {
  const east = handle.includes('e');
  const west = handle.includes('w');
  const north = handle.includes('n');
  const south = handle.includes('s');
  const minW = Math.min(100, initial.width);
  const minH = Math.min(55, initial.height);
  const maxW = Math.min(canvasWidth, initial.width * 4);
  const maxH = Math.min(canvasHeight, initial.height * 4);
  let w = initial.width + (east ? dx : west ? -dx : 0);
  let h = initial.height + (south ? dy : north ? -dy : 0);
  if (proportional && (east || west) && (north || south)) {
    const widthFactor = w / initial.width;
    const heightFactor = h / initial.height;
    const factor = Math.abs(widthFactor - 1) >= Math.abs(heightFactor - 1) ? widthFactor : heightFactor;
    w = initial.width * factor;
    h = initial.height * factor;
  }
  const clampW = (value: number) => clamp(value, minW, Math.max(minW, Math.min(maxW, east ? canvasWidth - initial.x : west ? initial.x + initial.width : maxW)));
  const clampH = (value: number) => clamp(value, minH, Math.max(minH, Math.min(maxH, south ? canvasHeight - initial.y : north ? initial.y + initial.height : maxH)));
  w = clampW(w); h = clampH(h);
  if (proportional && (east || west) && (north || south)) {
    const factor = Math.min(w / initial.width, h / initial.height);
    w = clampW(initial.width * factor);
    h = clampH(initial.height * factor);
  }
  return {
    x: west ? initial.x + initial.width - w : initial.x,
    y: north ? initial.y + initial.height - h : initial.y,
    width: w,
    height: h,
  };
}

/** Linhas das cartelas de 102 px: afastamento mínimo entre corpo e texto inferior. */
export function compactCardTextBaselines(height: number): { main: number; secondary: number } {
  return {main: height * .64, secondary: height * .92};
}
