import type { BulletMode, RichTextSettings, TextAlign } from './types';

/** Configuração persistida no JSON v1; campos novos são opcionais nos projetos anteriores. */
export const DEFAULT_RICH_TEXT: RichTextSettings = {
  titleSize: 36, bodySize: 45, titleBold: true, titleItalic: false,
  titleUnderline: false, bodyBold: false, bodyItalic: false,
  bodyUnderline: false, alignment: 'left', bullets: 'none', scroll: 'none', scrollSpeed: 100,
  scrollLine1: false, scrollLine2: false, scrollPixelsPerSecond: 200, scrollRepeats: 1, scrollGap: 240,
};

export type RichRun = { text: string; bold: boolean; italic: boolean; underline: boolean };
export type RichLine = { runs: RichRun[]; paragraphIndex: number; lastInParagraph: boolean };
export type RichLayout = { lines: RichLine[]; lineHeight: number; contentHeight: number };

/** Sintaxe de formatação por trecho: **negrito**, *itálico*, __sublinhado__. */
export function parseRuns(input: string): RichRun[] {
  const pieces = input.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*)/g);
  return pieces.filter(Boolean).map(piece => {
    if (piece.startsWith('**') && piece.endsWith('**')) return { text:piece.slice(2,-2), bold:true, italic:false, underline:false };
    if (piece.startsWith('__') && piece.endsWith('__')) return { text:piece.slice(2,-2), bold:false, italic:false, underline:true };
    if (piece.startsWith('*') && piece.endsWith('*')) return { text:piece.slice(1,-1), bold:false, italic:true, underline:false };
    return { text:piece, bold:false, italic:false, underline:false };
  });
}

export function bulletPrefix(index:number, mode:BulletMode):string {
  return mode === 'chevrons' ? '» ' : mode === 'dots' ? '• ' : mode === 'numbers' ? `${index + 1}. ` : '';
}

function defaultMeasure(s:string, size:number, bold:boolean):number {
  return [...s].length * size * (bold ? .62 : .54);
}
export type MeasureRich = (text: string, fontSize:number, bold:boolean, italic:boolean) => number;
export function layoutRichText(
  input:string, maxWidth:number, fontSize:number, lineHeightFactor:number,
  bullets:BulletMode, baseBold:boolean, baseItalic:boolean,
  measure:MeasureRich = (text,size,bold) => defaultMeasure(text,size,bold),
): RichLayout {
  const lineHeight = Math.max(1, fontSize*lineHeightFactor);
  const lines: RichLine[] = [];
  const paragraphs = input.split('\n');
  for (let i=0;i<paragraphs.length;i++) {
    const prefix = bulletPrefix(i, bullets);
    const tokens:RichRun[] = [ ...(prefix ? [{text:prefix,bold:true,italic:false,underline:false}] : []), ...parseRuns(paragraphs[i]) ];
    const atoms:RichRun[]=[];
    for (const run of tokens) {
      for (const atom of run.text.match(/\s+|\S+/gu)||[]) atoms.push({...run,text:atom});
    }
    let current:RichRun[]=[];let width=0;
    const pushLine = () => { lines.push({runs:current,paragraphIndex:i,lastInParagraph:false});current=[];width=0; };
    for (const atom of atoms) {
      const bold=baseBold||atom.bold,italic=baseItalic||atom.italic;
      const atomWidth=measure(atom.text,fontSize,bold,italic);
      if (/^\s+$/u.test(atom.text) && current.length===0) continue;
      if (current.length && width+atomWidth>maxWidth) {
        pushLine();
        if (/^\s+$/u.test(atom.text)) continue;
      }
      // Divide palavras muito longas, evitando ultrapassar os limites da cartela.
      if (atomWidth > maxWidth) {
        for (const char of [...atom.text]) {
          const cw=measure(char,fontSize,bold,italic);
          if (current.length && width+cw>maxWidth) pushLine();
          current.push({...atom,text:char});width+=cw;
        }
      } else {current.push(atom);width+=atomWidth;}
    }
    pushLine();
    lines[lines.length-1].lastInParagraph=true;
  }
  return {lines,lineHeight,contentHeight:lines.length*lineHeight};
}

export function textAnchor(align:TextAlign):'start'|'middle'|'end' {
  return align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
}
export function alignedX(align:TextAlign,x:number,width:number):number {
  return align === 'center' ? x+width/2 : align==='right' ? x+width : x;
}
