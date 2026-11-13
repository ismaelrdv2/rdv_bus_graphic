import type { AnimationStyle, ElementKind, HudElement, RDVProject, TextField, TextColorRole, PaletteId, TextColorGroup } from './types';
import { MAX_ELEMENTS, SCHEMA_VERSION } from './types';
import { KINDS } from './templates';
import { BRAND } from './brand';
import { DEFAULT_COLORS, DEFAULT_PALETTE, PALETTE_PRESETS, parseColor } from './palette';
import { clamp } from './timing';
import { normalizeFontName } from './fonts';
import { PORTRAIT_BAR_HEIGHT } from './geometry';
import { DEFAULT_RICH_TEXT } from './richtext';

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const safeString = (value: unknown, max = 500) => typeof value === 'string' ? value.slice(0, max) : '';
const safeNumber = (v: unknown, fallback: number, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback;
const safeColor = (v: unknown, fallback: string) => typeof v === 'string' ? (parseColor(v) || fallback) : fallback;
const keys: TextField[] = ['heading', 'line1', 'line2', 'line3', 'line4', 'line5', 'line6'];

export function validateProject(raw: unknown): RDVProject {
  if (!isObject(raw) || raw.schemaVersion !== SCHEMA_VERSION || !Array.isArray(raw.elements) || !isObject(raw.canvas)) {
    throw new Error('Projeto inválido ou de uma versão ainda não suportada.');
  }
  if (raw.elements.length > MAX_ELEMENTS) throw new Error(`O projeto excede o limite de ${MAX_ELEMENTS} elementos.`);
  const canvas = raw.canvas;
  const portrait = canvas.width === 1080 && canvas.height === 1920;
  const canvasWidth = portrait ? 1080 : 1920;
  const canvasHeight = portrait ? 1920 : 1080;
  const usedIds = new Set<string>();
  const elements: HudElement[] = raw.elements.map((item, index) => {
    if (!isObject(item) || !KINDS.includes(item.kind as ElementKind) || !isObject(item.style) || !isObject(item.fields)) {
      throw new Error(`Elemento ${index + 1} inválido no arquivo do projeto.`);
    }
    const style = item.style;
    const fields = item.fields;
    const technical = item.kind === 'technical';
    const freeText = item.kind === 'freeText';
    const freeTextStyle = ['technicalBar', 'technicalAlpha1', 'fullTechnical', 'fullPage', 'legacyLabel', 'legacyHalfBar', 'legacyFullBar', 'legacyPresentationBar', 'legacyPresentationSlide', 'newsLabel', 'newsTicker', 'newsLowerThird', 'newsSlide'].includes(String(item.freeTextStyle))
      ? item.freeTextStyle as HudElement['freeTextStyle'] : 'classic';
    const rawCaptions = Array.isArray(item.freeTextCaptions) ? item.freeTextCaptions : [];
    const captions = ['CARROCERIA', 'MODELO', 'CHASSI', 'MODELO', 'EMPRESA', 'PREFIXO']
      .map((defaultLabel, labelIndex) => typeof rawCaptions[labelIndex] === 'string'
        ? safeString(rawCaptions[labelIndex], 80) : defaultLabel);
    const technicalSide = item.technicalSide === 'right' || (item.technicalSide !== 'left' && typeof style.x === 'number' && style.x > canvasWidth / 2) ? 'right' : 'left';
    const fullscreen = (technical && ['fullscreen','legacyFullscreen'].includes(String(item.technicalLayout))) || (freeText && ['fullTechnical','fullPage','legacyPresentationSlide','newsSlide'].includes(freeTextStyle || ''));
    const requestedWidth = safeNumber(style.width, technical ? 640 : 850, 140, 1920);
    const bar = (technical && !fullscreen) || (freeText && freeTextStyle === 'technicalBar');
    const bottomBar = portrait && bar;
    const safeWidth = fullscreen || bottomBar ? canvasWidth : bar ? Math.max(640, Math.min(requestedWidth, canvasWidth)) : Math.min(requestedWidth, canvasWidth);
    let id = safeString(item.id, 100) || `importado-${index}`;
    if (usedIds.has(id)) id += `-${index}`;
    usedIds.add(id);
    const animation: AnimationStyle = ['fade', 'none', 'legacy', 'curtain', 'zoom', 'split'].includes(String(item.animation)) ? item.animation as AnimationStyle : 'slide';
    const imageData = typeof item.imageData === 'string' && item.imageData.length < 5_600_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.imageData)
      ? item.imageData : undefined;
    const formatRaw = isObject(item.textFormatting) ? item.textFormatting : {};
    const formats = Object.fromEntries(Object.entries(formatRaw).flatMap(([key, v]) => {
      if (!/^(heading|line[1-6]|caption[0-5])$/.test(key) || !isObject(v)) return [];
      const formatting: Record<string, number | boolean | string> = {};
      for (const prop of ['bold', 'italic', 'underline'] as const) {
        if (typeof v[prop] === 'boolean') formatting[prop] = v[prop];
      }
      if (typeof v.size === 'number' && Number.isFinite(v.size)) formatting.size = safeNumber(v.size, 32, 9, 180);
      if (typeof v.family === 'string') formatting.family = normalizeFontName(v.family);
      return Object.keys(formatting).length ? [[key, formatting]] : [];
    }));
    const rawRoles = isObject(item.textColors) ? item.textColors : {};
    const validTextRoles = Object.fromEntries(Object.entries(rawRoles).filter(([key,role]) =>
      /^(heading|line[1-6]|caption[0-5]|footer)$/.test(key) && ['white','primary','secondary','original'].includes(String(role))
    )) as Record<string, TextColorRole>;
    const rawGroups = isObject(item.textGroups) ? item.textGroups : {};
    const validGroups = Object.fromEntries(Object.entries(rawGroups).filter(([group,role]) =>
      ['title','body','secondary'].includes(group) && ['white','primary','secondary','original'].includes(String(role))
    )) as Partial<Record<TextColorGroup, TextColorRole>>;
    const technicalCaptions = Array.isArray(item.technicalCaptions)
      ? ['CARROCERIA','MODELO','CHASSI','MODELO','EMPRESA','PREFIXO'].map((label, i) => typeof item.technicalCaptions === 'object' &&
          Array.isArray(item.technicalCaptions) && typeof item.technicalCaptions[i] === 'string' ? safeString(item.technicalCaptions[i],80) : label)
      : undefined;
    return {
      id,
      ...(Object.keys(formats).length ? { textFormatting: formats } : {}),
      ...(technicalCaptions ? { technicalCaptions } : {}),
      ...(Object.keys(validTextRoles).length ? { textColors: validTextRoles } : {}),
      ...(Object.keys(validGroups).length ? { textGroups: validGroups } : {}),
      kind: item.kind as ElementKind,
      title: safeString(item.title, 80) || 'Elemento',
      visible: item.visible !== false,
      animation,
      shineEnabled:item.shineEnabled!==false,
      diagonalGlowEnabled:item.diagonalGlowEnabled===true,
      diagonalGlowIntensity:safeNumber(item.diagonalGlowIntensity,170,50,300),
      visualPreset: item.visualPreset === 'legacy' ? 'legacy' : 'studio',
      footerMode: ['text','image','none'].includes(String(item.footerMode)) ? item.footerMode as HudElement['footerMode'] : 'text',
      footerText: typeof item.footerText === 'string' ? safeString(item.footerText,100) : 'RDV BUS',
      ...(typeof item.footerImageData === 'string' && item.footerImageData.length < 5_600_000
        && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.footerImageData)
        ? {footerImageData:item.footerImageData} : {}),
      ...((technical || freeText) ? { technicalSide } : {}),
      ...(technical ? {technicalLayout: item.technicalLayout === 'legacyFullscreen' ? 'legacyFullscreen' as const : item.technicalLayout === 'fullscreen' ? 'fullscreen' as const : 'side' as const} : {}),
      ...(freeText ? { freeTextStyle, freeTextCaptions: captions,
        freeTextDisplay: ['both','first','second','alternate'].includes(String(item.freeTextDisplay)) ? item.freeTextDisplay as HudElement['freeTextDisplay'] : 'both' as const,
        freeTextIcon: ['facebook','instagram','x','tiktok','twitch','whatsapp','telegram','discord'].includes(String(item.freeTextIcon)) ? item.freeTextIcon as HudElement['freeTextIcon'] : 'none' as const,
        richText: (() => { const rich = isObject(item.richText) ? item.richText : {};
          const safeBool = (key:keyof typeof DEFAULT_RICH_TEXT) => typeof rich[key] === 'boolean' ? rich[key] : DEFAULT_RICH_TEXT[key];
          return {
            titleSize: safeNumber(rich.titleSize, DEFAULT_RICH_TEXT.titleSize, 14, 140),
            bodySize: safeNumber(rich.bodySize, DEFAULT_RICH_TEXT.bodySize, 14, 140),
            titleBold: safeBool('titleBold') as boolean, titleItalic: safeBool('titleItalic') as boolean,
            titleUnderline: safeBool('titleUnderline') as boolean, bodyBold: safeBool('bodyBold') as boolean,
            bodyItalic: safeBool('bodyItalic') as boolean, bodyUnderline: safeBool('bodyUnderline') as boolean,
            alignment: ['left','center','right','justify'].includes(String(rich.alignment)) ? rich.alignment as typeof DEFAULT_RICH_TEXT.alignment : 'left',
            bullets: ['none','chevrons','dots','numbers'].includes(String(rich.bullets)) ? rich.bullets as typeof DEFAULT_RICH_TEXT.bullets : 'none',
            scroll: ['none','vertical','horizontal'].includes(String(rich.scroll)) ? rich.scroll as typeof DEFAULT_RICH_TEXT.scroll : 'none',
            scrollSpeed: safeNumber(rich.scrollSpeed, 100, 25, 300),
            scrollLine1: rich.scrollLine1 === true, scrollLine2: rich.scrollLine2 === true,
            scrollPixelsPerSecond: safeNumber(rich.scrollPixelsPerSecond, 200, 30, 1400),
            scrollRepeats: Math.round(safeNumber(rich.scrollRepeats, 1, 1, 20)),
            scrollGap: safeNumber(rich.scrollGap, 240, 0, 1000),
          };
        })(),
      } : {}),
      fields: Object.fromEntries(keys.map(key => [key, safeString(fields[key], freeText && key === 'line1' ? 6000 : 500)])) as HudElement['fields'],
      style: {
        x: fullscreen || bottomBar ? 0 : bar ? (technicalSide === 'right' ? canvasWidth - safeWidth * safeNumber(style.scaleX,1,.2,4) : 0) : safeNumber(style.x, 72, 0, canvasWidth),
        y: fullscreen ? 0 : bottomBar ? canvasHeight - PORTRAIT_BAR_HEIGHT * safeNumber(style.scaleY,1,.75,1.4) : technical || bar ? 0 : safeNumber(style.y, 816, 0, canvasHeight),
        width: safeWidth,
        fontSize: safeNumber(style.fontSize, 48, 16, 110),
        fontFamily: normalizeFontName(style.fontFamily),
        accent: safeColor(style.accent, BRAND.gold),
        secondary: safeColor(style.secondary, BRAND.lilac),
        background: safeColor(style.background, BRAND.purpleDeep),
        opacity: safeNumber(style.opacity, 100, 0, 100),
        scaleX: fullscreen || bottomBar ? 1 : safeNumber(style.scaleX, 1, 0.2, 4),
        scaleY: fullscreen ? 1 : bottomBar ? safeNumber(style.scaleY,1,.75,1.4) : safeNumber(style.scaleY, 1, 0.2, 4),
      },
      ...(imageData ? { imageData } : {}),
    };
  });
  const paletteRaw = isObject(raw.palette) ? raw.palette : {};
  const paletteRawColors = isObject(paletteRaw.colors) ? paletteRaw.colors : {};
  const palettePreset = PALETTE_PRESETS.find(p => p.id === paletteRaw.preset);
  const palette: import('./types').ProjectPalette = {
    preset: paletteRaw.preset === 'custom' ? 'custom' as PaletteId : palettePreset?.id || DEFAULT_PALETTE.preset,
    colors: {
      primary: safeColor(paletteRawColors.primary, palettePreset?.colors.primary || DEFAULT_COLORS.primary),
      secondary: safeColor(paletteRawColors.secondary, palettePreset?.colors.secondary || DEFAULT_COLORS.secondary),
      background: safeColor(paletteRawColors.background, palettePreset?.colors.background || DEFAULT_COLORS.background),
    },
  };
  return {
    schemaVersion: 1,
    appVersion: safeString(raw.appVersion, 40) || 'desconhecida',
    id: safeString(raw.id, 100) || 'importado',
    name: safeString(raw.name, 120) || 'Projeto importado',
    createdAt: safeString(raw.createdAt, 32) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvas: {
      width: canvasWidth, height: canvasHeight, // Full HD horizontal ou vertical.
      fps: canvas.fps === 30 ? 30 : 60,
      duration: safeNumber(canvas.duration, 5.3, 1, 30),
    },
    palette,
    elements,
  };
}
