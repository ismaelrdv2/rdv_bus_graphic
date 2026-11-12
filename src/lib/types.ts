export const APP_VERSION = '0.1.0-alpha.9.2.2';
export const SCHEMA_VERSION = 1;
export const DEFAULT_DURATION = 5.3;
export const MAX_ELEMENTS = 64;

export type ElementKind =
  | 'technical' | 'location' | 'date' | 'route'
  | 'driver' | 'credit' | 'freeText' | 'slide' | 'corner';
export type TextField = 'heading' | 'line1' | 'line2' | 'line3' | 'line4' | 'line5' | 'line6';
export type AnimationStyle = 'slide' | 'fade' | 'none' | 'legacy';
export type VisualPreset = 'studio' | 'legacy';
export type FreeTextStyle = 'classic' | 'technicalBar' | 'technicalAlpha1' | 'fullTechnical' | 'fullPage'
  | 'legacyLabel' | 'legacyHalfBar' | 'legacyFullBar' | 'legacyPresentationBar' | 'legacyPresentationSlide';
export type TechnicalLayout = 'side' | 'fullscreen' | 'legacyFullscreen';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type BulletMode = 'none' | 'chevrons' | 'dots' | 'numbers';
export type ScrollMode = 'none' | 'vertical' | 'horizontal';
export interface RichTextSettings {
  titleSize: number;
  bodySize: number;
  titleBold: boolean;
  titleItalic: boolean;
  titleUnderline: boolean;
  bodyBold: boolean;
  bodyItalic: boolean;
  bodyUnderline: boolean;
  alignment: TextAlign;
  bullets: BulletMode;
  scroll: ScrollMode;
  scrollSpeed: number;
  /** Modos originais da versão 0.14: rolagem independente das linhas. */
  scrollLine1: boolean;
  scrollLine2: boolean;
  scrollPixelsPerSecond: number;
  scrollRepeats: number;
  scrollGap: number;
}


export interface HudStyle {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  /** Família de fonte do sistema, usada em todos os textos do elemento. */
  fontFamily?: string;
  accent: string;
  background: string;
  opacity: number;
  /** Escala independente para edição diretamente na pré-visualização. */
  scaleX: number;
  scaleY: number;
}

/** Personalização pontual da tipografia, sem modificar os presets originais. */
export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  size?: number;
  family?: string;
}
export interface HudElement {
  id: string;
  kind: ElementKind;
  title: string;
  visible: boolean;
  fields: Record<TextField, string>;
  /** heading, line1..line6, caption0..caption5; opcional para projetos antigos. */
  textFormatting?: Record<string, TextFormatting>;
  /** Permite personalizar rótulos da ficha técnica original. */
  technicalCaptions?: string[];
  style: HudStyle;
  animation: AnimationStyle;
  /** Visual clássico original ou modelo Studio da reconstrução. */
  visualPreset?: VisualPreset;
  imageData?: string;
  technicalSide?: 'left' | 'right';
  /** Estilos opcionais do Texto livre; versões anteriores usam 'classic'. */
  freeTextStyle?: FreeTextStyle;
  /** Rótulos personalizados dos campos nos dois estilos de ficha. */
  freeTextCaptions?: string[];
  /** Ficha tradicional lateral ou ficha técnica em tela inteira. */
  technicalLayout?: TechnicalLayout;
  /** Configurações da área de título e corpo do Texto Livre. */
  richText?: RichTextSettings;
}

export interface RDVProject {
  schemaVersion: 1;
  appVersion: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: {
    width: number;
    height: number;
    fps: number;
    duration: number;
  };
  elements: HudElement[];
}

export type UiStatus = { kind: 'info' | 'success' | 'error'; text: string };
