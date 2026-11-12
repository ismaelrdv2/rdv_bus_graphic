<script lang="ts">
  import { BRAND, TECHNICAL_CAPTIONS } from '../lib/brand';
  import { CARD_ICONS } from '../lib/cardIcons';
  import { palettePaint, textColor } from '../lib/palette';
  import type { TextColorKey, TextColorRole } from '../lib/types';
  import LegacyShape from './LegacyShape.svelte';
  import BottomTechnical from './BottomTechnical.svelte';
  import { fontStack } from '../lib/fonts';
  import type { HudElement } from '../lib/types';
  import { fieldTextStyle } from '../lib/inlineText';
  import { elementBaseHeight, isBar, compactCardTextBaselines } from '../lib/geometry';
  import { clamp } from '../lib/timing';
  import { DEFAULT_RICH_TEXT, layoutRichText, parseRuns, alignedX, textAnchor, type MeasureRich } from '../lib/richtext';

  export let element: HudElement;
  export let canvasHeight = 1080;
  export let canvasWidth = 1920;
  export let time = 0;
  export let duration = 5.3;

  $: portraitBottom = canvasHeight > canvasWidth && isBar(element);
  $: fontFamily = fontStack(element.style.fontFamily);
  $: shouldUseLegacy = element.kind === 'technical'
    ? (element.technicalLayout === 'legacyFullscreen' || (element.technicalLayout !== 'fullscreen' && element.visualPreset === 'legacy'))
    : element.kind === 'freeText'
      ? ['legacyLabel', 'legacyHalfBar', 'legacyFullBar', 'legacyPresentationBar', 'legacyPresentationSlide'].includes(element.freeTextStyle || '')
        || (element.visualPreset === 'legacy' && element.freeTextStyle === 'technicalBar')
      : element.visualPreset === 'legacy';
  $: sx = element.style.scaleX;
  $: sy = element.style.scaleY;
  // A caixa é redimensionada, mas o texto NÃO sofre transform(scaleX, scaleY).
  // Fontes são recalculadas em tamanho uniforme e ajustadas pela largura disponível.
  $: textFactor = clamp(Math.sqrt(sx * sy), .35, 2.8);
  $: w = element.style.width * sx;
  $: height = elementBaseHeight(element, canvasHeight) * sy;
  $: paint = palettePaint(element.style);
  $: accent = element.style.accent;
  $: bg = element.style.background;
  $: size = element.style.fontSize * textFactor;
  $: fields = element.fields;
  $: technical = isBar(element);
  $: fullTech = (element.kind === 'technical' && element.technicalLayout === 'fullscreen') || (element.kind === 'freeText' && element.freeTextStyle === 'fullTechnical');
  $: fullPage = element.kind === 'freeText' && element.freeTextStyle === 'fullPage';
  $: isRight = (element.technicalSide || 'left') === 'right';
  $: credit = element.kind === 'credit';
  // As cartelas compactas Studio reutilizam os ícones vetoriais originais.
  $: studioCard = !shouldUseLegacy && ['location','date','route','driver','credit'].includes(element.kind);
  $: studioTextX = studioCard ? 100 : 30;
  $: studioTextWidth = Math.max(90, w - studioTextX - 34);
  // A luz atravessa a cartela somente após a transição inicial do Studio.
  $: shineStart = Math.min(.84, Math.max(.16, duration * .18));
  $: shineLength = Math.min(.6, Math.max(.18, duration * .17));
  $: shineElapsed = (time - shineStart) / shineLength;
  $: studioShineVisible = studioCard && element.animation !== 'none' &&
    time >= shineStart && time < shineStart + shineLength && time < duration - .12;
  $: cardTextY = compactCardTextBaselines(height);
  $: corner = element.kind === 'corner';
  $: freeText = element.kind === 'freeText';
  $: technicalAlpha1 = freeText && element.freeTextStyle === 'technicalAlpha1';
  $: captions = freeText ? element.freeTextCaptions || TECHNICAL_CAPTIONS : element.technicalCaptions || TECHNICAL_CAPTIONS;
  $: slide = element.kind === 'slide';
  $: id = element.id.replace(/[^a-zA-Z0-9_-]/g, '');
  $: gradId = `hud-gradient-${id}`;
  $: clipId = `hud-clip-${id}`;
  $: contentClipId = `hud-content-${id}`;
  $: panelPath = isRight ? `M84 0 H${w} V${height} H0 Z` : `M0 0 H${w - 84} L${w} ${height} H0 Z`;
  $: edgePath = isRight ? `M84 0 L0 ${height}` : `M${w - 84} 0 L${w} ${height}`;
  // A barra à direita mantém a mesma margem de leitura da esquerda.
  $: titleX = isRight ? 116 : 52;
  $: innerX = isRight ? 136 : 92;
  $: innerRight = isRight ? w - 88 : w - 110;
  $: contentWidth = Math.max(140, innerRight - innerX);
  $: technicalValues = [fields.line1, fields.line2, fields.line3, fields.line4, fields.line5, fields.line6];
  $: rowStart = Math.max(100, Math.min(340 * sy, canvasHeight * .204 * sy));
  $: rowStep = Math.max(45, (height - rowStart - 138 * sy) / 6);
  $: rich = element.richText || DEFAULT_RICH_TEXT;
  $: portrait = w / height < .95;
  $: fullMargin = Math.max(32, Math.min(105, w * .065));
  $: fullColumns = portrait ? 1 : 2;
  // Campos preenchidos são distribuídos em linhas equilibradas. A grade não
  // reserva espaços vazios à direita e no topo quando apenas 1–2 campos são usados.
  $: activeTechnical = technicalValues.map((value, index) => ({ value, index }))
    .filter(item => item.value.trim().length > 0);
  $: fullRows = Math.max(1, Math.ceil(activeTechnical.length / fullColumns));
  $: fullGridGap = portrait ? 18 : 28;
  $: fullGridTop = height * .185;
  $: fullGridHeight = Math.max(120, height - fullGridTop - Math.max(90, fullMargin * .7));
  $: fullRowHeight = Math.max(72, Math.min(portrait ? 235 : 250,
    (fullGridHeight - (fullRows - 1) * fullGridGap) / fullRows));
  $: fullGridStartY = fullGridTop + Math.max(0,
    (fullGridHeight - fullRows * fullRowHeight - (fullRows - 1) * fullGridGap) / 2);
  $: fullCellWidth = (w - 2 * fullMargin - (fullColumns - 1) * 60) / fullColumns;
  $: fullFont = Math.min(size * 1.18, portrait ? 51 : 64, fullRowHeight * .42);
  $: fullTitleSize = Math.min(57, Math.max(25, w * .043));
  $: bodySize = clamp(rich.bodySize * textFactor, 12, 170);
  $: headingSize = clamp(rich.titleSize * textFactor, 12, 170);
  $: bodyLeft = fullPage ? fullMargin : 34;
  $: bodyWidth = Math.max(60, w - 2 * bodyLeft);
  $: bodyStart = fullPage ? Math.max(215, height * .22) : 73 * sy;
  $: bodyAreaHeight = fullPage ? height - bodyStart - fullMargin : Math.max(14, height - bodyStart - 10);
  $: bodyLayout = layoutRichText(fields.line1, bodyWidth, bodySize, 1.35, rich.bullets, rich.bodyBold, rich.bodyItalic, measureRich);
  $: scrollProgress = clamp(duration > 0 ? time / duration : 0, 0, 1) * (rich.scrollSpeed / 100);
  $: scrollOffset = bodyStart + bodyAreaHeight - scrollProgress * (bodyAreaHeight + bodyLayout.contentHeight);

  let measureContext: CanvasRenderingContext2D | null = null;
  const measureRich: MeasureRich = (value, font, bold, italic) => {
    if (typeof document === 'undefined') return [...value].length * font * .6;
    if (!measureContext) measureContext = document.createElement('canvas').getContext('2d');
    if (!measureContext) return [...value].length * font * .6;
    measureContext.font = `${italic ? 'italic ' : ''}${bold ? '800 ' : '400 '}${font}px ${fontFamily}`;
    return measureContext.measureText(value).width;
  };
  function scaledText(value: string, preferred: number, available: number): number {
    if (!value) return preferred;
    const measured = measureRich(value, preferred, true, false);
    if (!measured) return preferred;
    return Math.max(8, Math.min(preferred, preferred * available / measured * .985));
  }
  function lineWidth(runs: {text:string;bold:boolean;italic:boolean}[], font:number, baseBold:boolean, baseItalic:boolean):number {
    return runs.reduce((sum,run) => sum + measureRich(run.text,font,baseBold||run.bold,baseItalic||run.italic),0);
  }
  $: marquee = parseRuns(fields.line1.replace(/\n/g, ' · '));
  $: marqueeWidth = lineWidth(marquee,bodySize,rich.bodyBold,rich.bodyItalic);
  $: marqueeX = w - bodyLeft - scrollProgress * (marqueeWidth + w);
</script>

<g font-family={fontFamily}>
  {#if portraitBottom}
    <BottomTechnical {element} {time} {duration}/>
  {:else if shouldUseLegacy}
    <LegacyShape {element} {time} {duration} {canvasWidth} {canvasHeight}/>
  {:else if technical}
    <defs>
      <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color={paint.background}/><stop offset="0.67" stop-color={bg}/><stop offset="1" stop-color={paint.dark}/>
      </linearGradient>
      <clipPath id={clipId}><path d={panelPath}/></clipPath>
    </defs>
    <path d={panelPath} fill={`url(#${gradId})`}/>
    <path d={edgePath} stroke={accent} stroke-width="5" fill="none"/>
    <path d={isRight ? `M104 0 L20 ${height}` : `M${w-105} 0 L${w-20} ${height}`} stroke={paint.edge} stroke-width="2" fill="none"/>
    <g clip-path={`url(#${clipId})`}>
      <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={titleX} y={111*sy} fill={textColor(element,'heading','primary')} font-family={fontFamily} font-weight="800" font-size={scaledText(fields.heading, 36 * textFactor, contentWidth)} letter-spacing="5">{fields.heading}</text>
      <path d={`M${titleX} ${132*sy} H${innerRight}`} stroke={paint.edge} stroke-width="2"/>
      <path d={`M${titleX} ${132*sy} H${titleX + Math.min(115, contentWidth*.35)}`} stroke={accent} stroke-width="3"/>
      {#each technicalValues as value, index}
        {#if value}
          {@const y = rowStart + index * rowStep}
          <path d={`M${innerX - 44} ${y + 3} l12 13 -12 13 M${innerX - 30} ${y+3} l12 13 -12 13`} stroke={accent} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <text data-edit-caption={index} style={fieldTextStyle(element,'caption'+index)} x={innerX} y={y+3} fill={textColor(element,('caption'+index) as TextColorKey,'secondary')} font-family={fontFamily} font-weight="800" font-size={Math.min(17*textFactor, rowStep*.21)} letter-spacing="3">{captions[index] || ''}</text>
          <text data-edit-field={'line'+(index+1)} style={fieldTextStyle(element,'line'+(index+1))} x={innerX} y={y+Math.min(42*sy,rowStep*.52)} fill={textColor(element,('line'+(index+1)) as TextColorKey,'white')} font-family={fontFamily} font-weight="800" font-size={scaledText(value, Math.min(size, rowStep*.43), contentWidth)}>{value}</text>
          <path d={`M${innerX} ${y + rowStep*.7} H${innerRight}`} stroke={paint.edge} stroke-width="2"/>
        {/if}
      {/each}
      <text x={titleX} y={height - 39*sy} fill={textColor(element,'footer','secondary')} font-size={16*textFactor} font-weight="800" font-family={fontFamily} letter-spacing="7">RDV BUS</text>
      <path d={`M${innerRight-42} ${height-36*sy} h31 l22 -22`} fill="none" stroke={accent} stroke-width="2"/>
    </g>
  {:else if fullTech}
    <!-- Ficha técnica em tela inteira, com campos organizados em grade. -->
    <defs><linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1"><stop stop-color={paint.background}/><stop offset=".75" stop-color={bg}/><stop offset="1" stop-color={paint.dark}/></linearGradient></defs>
    <rect width={w} height={height} fill={`url(#${gradId})`} fill-opacity=".96"/>
    <path d={`M${fullMargin} ${height*.118} H${w-fullMargin}`} stroke={paint.edge} stroke-width="3"/>
    <path d={`M${fullMargin} ${height*.118} H${fullMargin+Math.min(260,w*.21)}`} stroke={accent} stroke-width="5"/>
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={fullMargin} y={height*.104} fill={textColor(element,'heading','primary')} font-family={fontFamily} font-weight="800" font-size={scaledText(fields.heading,fullTitleSize,w-2*fullMargin)} letter-spacing="5">{fields.heading}</text>
    {#each activeTechnical as item, position (item.index)}
      {@const index = item.index}
      {@const value = item.value}
      {@const col = position % fullColumns}
      {@const row = Math.floor(position / fullColumns)}
      {@const countInRow = Math.min(fullColumns, activeTechnical.length - row * fullColumns)}
      {@const x = fullMargin + (fullColumns - countInRow) * (fullCellWidth + 60) / 2 + col * (fullCellWidth + 60)}
      {@const y = fullGridStartY + row * (fullRowHeight + fullGridGap)}
      <path d={`M${x} ${y+9} l15 17 -15 17 M${x+16} ${y+9} l15 17 -15 17`} stroke={accent} stroke-width="4" fill="none" stroke-linecap="round"/>
      <text data-edit-caption={index} style={fieldTextStyle(element,'caption'+index)} x={x+48} y={y+16} font-family={fontFamily} font-size={Math.min(21,fullRowHeight*.19)} fill={textColor(element,('caption'+index) as TextColorKey,'secondary')} font-weight="800" letter-spacing="3">{captions[index] || ''}</text>
      <text data-edit-field={'line'+(index+1)} style={fieldTextStyle(element,'line'+(index+1))} x={x+48} y={y+Math.min(76,fullRowHeight*.64)} font-family={fontFamily} font-size={scaledText(value,fullFont,fullCellWidth-58)} fill={textColor(element,('line'+(index+1)) as TextColorKey,'white')} font-weight="800">{value}</text>
      <path d={`M${x+48} ${y+fullRowHeight*.78} H${x+fullCellWidth}`} stroke={paint.edge} stroke-width="2"/>
    {/each}
    <text x={fullMargin} y={height-38} font-size="16" fill={textColor(element,'footer','secondary')} letter-spacing="8" font-weight="800">RDV BUS</text>
    <path d={`M${w-fullMargin-70} ${height-36} h45 l24 -24`} stroke={accent} stroke-width="3" fill="none"/>
  {:else if technicalAlpha1}
    <rect width={w} height={height} rx="16" fill={bg} fill-opacity="0.95"/>
    <rect width="7" height={height} rx="3" fill={accent}/>
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x="33" y={53*sy} fill={textColor(element,'heading','primary')} font-size={scaledText(fields.heading,25*textFactor,w-66)} letter-spacing="3" font-weight="700" font-family={fontFamily}>{fields.heading}</text>
    <path d={`M33 ${77*sy} H${w-30}`} stroke="#39445a" stroke-width="2"/>
    {#each [fields.line1,fields.line2,fields.line3,fields.line4] as value, index}
      {#if value}
        <text data-edit-caption={index} style={fieldTextStyle(element,'caption'+index)} x="33" y={(132+index*86)*sy} fill={textColor(element,('caption'+index) as TextColorKey,'secondary')} font-family={fontFamily} font-size={scaledText(captions[index] || '',21*textFactor,w-66)}>{captions[index] || ''}</text>
        <text data-edit-field={'line'+(index+1)} style={fieldTextStyle(element,'line'+(index+1))} x="33" y={(170+index*86)*sy} fill={textColor(element,('line'+(index+1)) as TextColorKey,'white')} font-family={fontFamily} font-size={scaledText(value,Math.min(size,32*textFactor),w-66)} font-weight="600">{value}</text>
      {/if}
    {/each}
  {:else if fullPage}
    <defs><linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1"><stop stop-color={paint.background}/><stop offset="1" stop-color={bg}/></linearGradient>
      <clipPath id={contentClipId}><rect x={bodyLeft} y={bodyStart} width={bodyWidth} height={bodyAreaHeight}/></clipPath>
    </defs>
    <rect width={w} height={height} fill={`url(#${gradId})`} fill-opacity=".96"/>
    <path d={`M${fullMargin} ${height*.15} H${w-fullMargin}`} stroke={paint.edge} stroke-width="3"/>
    <path d={`M${fullMargin} ${height*.15} H${fullMargin+Math.min(250,w*.25)}`} stroke={accent} stroke-width="5"/>
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={fullMargin} y={height*.128} fill={textColor(element,'heading','primary')} font-family={fontFamily} font-size={scaledText(fields.heading, headingSize, w-2*fullMargin)} font-weight={rich.titleBold?'800':'400'} font-style={rich.titleItalic?'italic':'normal'} text-decoration={rich.titleUnderline?'underline':'none'} letter-spacing="2">{fields.heading}</text>
    <g clip-path={`url(#${contentClipId})`}>
      <g transform={rich.scroll==='vertical' ? `translate(0 ${scrollOffset-bodyStart})` : ''}>
        {#each bodyLayout.lines as line, index}
          <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={alignedX(rich.alignment,bodyLeft,bodyWidth)} y={bodyStart + (index+1)*bodyLayout.lineHeight} text-anchor={textAnchor(rich.alignment)} textLength={rich.alignment === 'justify' && !line.lastInParagraph ? bodyWidth : undefined} lengthAdjust="spacing" xml:space="preserve" fill={textColor(element,'line1','white')} font-family={fontFamily} font-size={bodySize} font-weight={rich.bodyBold?'800':'400'} font-style={rich.bodyItalic?'italic':'normal'} text-decoration={rich.bodyUnderline?'underline':'none'}>
            {#each line.runs as run}<tspan font-weight={run.bold?'800':(rich.bodyBold?'800':'400')} font-style={run.italic?'italic':(rich.bodyItalic?'italic':'normal')} text-decoration={run.underline||rich.bodyUnderline?'underline':'none'}>{run.text}</tspan>{/each}
          </text>
        {/each}
      </g>
    </g>
    <text x={fullMargin} y={height-34} font-size="16" fill={textColor(element,'footer','secondary')} font-weight="800" letter-spacing="7">RDV BUS</text>
    <path d={`M${w-fullMargin-65} ${height-34} h44 l19 -19`} fill="none" stroke={accent} stroke-width="3"/>
  {:else if corner}
    <rect width={w} height={height} rx="15" fill={bg} fill-opacity="0.96" stroke={paint.edge} stroke-width="3"/>
    <path d={`M12 1 H${Math.min(w/2,120)}`} stroke={accent} stroke-width="4"/>
    <path d={`M${w-85} ${height-2} h62 l15 -14`} stroke={paint.edge} stroke-width="3" fill="none"/>
    {#if element.imageData}
      <image href={element.imageData} x="7" y="7" width={w-14} height={height-14} preserveAspectRatio="xMidYMid meet"/>
    {:else}
      <path d={`M${w/2-36} ${height*.24} h72 v${height*.34} h-72z`} fill="none" stroke={accent} stroke-width="3"/>
      <text x={w/2} y={height*.74} font-family={fontFamily} font-size={Math.min(15*textFactor,w/16)} fill={paint.muted} text-anchor="middle">ESCOLHA UMA IMAGEM</text>
    {/if}
  {:else if credit}
    <rect width={w} height={height} rx="15" fill={bg} fill-opacity="0.98" stroke={paint.edge} stroke-width="3"/>
    <path d={`M13 2 H${Math.min(w*.5,198)}`} stroke={accent} stroke-width="5"/>
    <path d={`M${w-115} ${height-2} h80 l22 -20`} stroke={accent} stroke-width="3" fill="none"/>
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={studioTextX} y={height*.30} font-family={fontFamily} font-weight="800" font-size={Math.min(15*textFactor,height*.2)} fill={textColor(element,'heading','secondary')} letter-spacing="2.8">{fields.heading}</text>
    <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={studioTextX} y={cardTextY.main} font-family={fontFamily} font-weight="800" font-size={scaledText(fields.line1,Math.min(size,height*.37),studioTextWidth)} fill={textColor(element,'line1','white')}>{fields.line1}</text>
    <text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x={studioTextX} y={cardTextY.secondary} font-family={fontFamily} font-size={Math.min(17*textFactor,height*.17)} fill={textColor(element,'line2','secondary')}>{fields.line2}</text>
  {:else if freeText && element.freeTextStyle === 'classic'}
    <defs><clipPath id={contentClipId}><rect x="30" y={bodyStart} width={w-60} height={bodyAreaHeight}/></clipPath></defs>
    <path d={`M14 0 H${w-32} L${w} 26 V${height-20} Q${w} ${height} ${w-20} ${height} H16 Q0 ${height} 0 ${height-16} V14 Q0 0 14 0Z`} fill={bg} fill-opacity=".97" stroke={paint.edge} stroke-width="3"/>
    <path d={`M16 1 H${Math.min(w*.38,230)}`} stroke={accent} stroke-width="5"/>
    <path d={`M${w-120} ${height-1} h82 l25 -21`} stroke={accent} stroke-width="3" fill="none"/>
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x="34" y={42*sy} font-size={scaledText(fields.heading,Math.min(headingSize,height*.24),w-70)} fill={textColor(element,'heading','secondary')} font-family={fontFamily} font-weight={rich.titleBold?'800':'400'} font-style={rich.titleItalic?'italic':'normal'} text-decoration={rich.titleUnderline?'underline':'none'} letter-spacing="3">{fields.heading}</text>
    <path d={`M34 ${58*sy} H${Math.min(w-38,520)}`} stroke={paint.edge} stroke-width="2"/>
    <g clip-path={`url(#${contentClipId})`}>
      {#if rich.scroll === 'horizontal'}
        <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={marqueeX} y={bodyStart + bodyAreaHeight*.66} font-family={fontFamily} xml:space="preserve" font-size={bodySize} fill={textColor(element,'line1','white')} font-weight={rich.bodyBold?'800':'400'} font-style={rich.bodyItalic?'italic':'normal'} text-decoration={rich.bodyUnderline?'underline':'none'}>
          {#each marquee as run}<tspan font-weight={run.bold?'800':(rich.bodyBold?'800':'400')} font-style={run.italic?'italic':(rich.bodyItalic?'italic':'normal')} text-decoration={run.underline||rich.bodyUnderline?'underline':'none'}>{run.text}</tspan>{/each}
        </text>
      {:else if rich.scroll === 'none' && fields.line2 && !fields.line1.includes('\n') && rich.bullets === 'none'}
        <!-- Compatibilidade com a cartela da alpha.5: título, mensagem e subtítulo. -->
        <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={alignedX(rich.alignment,bodyLeft,bodyWidth)} y={height*.63} text-anchor={textAnchor(rich.alignment)} xml:space="preserve" font-family={fontFamily} font-size={scaledText(fields.line1,Math.min(bodySize,height*.35),bodyWidth)} fill={textColor(element,'line1','white')} font-weight={rich.bodyBold?'800':'400'} font-style={rich.bodyItalic?'italic':'normal'} text-decoration={rich.bodyUnderline?'underline':'none'}>
          {#each parseRuns(fields.line1) as run}<tspan font-weight={run.bold?'800':(rich.bodyBold?'800':'400')} font-style={run.italic?'italic':(rich.bodyItalic?'italic':'normal')} text-decoration={run.underline||rich.bodyUnderline?'underline':'none'}>{run.text}</tspan>{/each}
        </text>
        <text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x={alignedX(rich.alignment,bodyLeft,bodyWidth)} y={height*.92} text-anchor={textAnchor(rich.alignment)} font-family={fontFamily} font-size={scaledText(fields.line2,Math.min(23*textFactor,height*.17),bodyWidth)} fill={textColor(element,'line2','secondary')}>{fields.line2}</text>
      {:else}
        <g transform={rich.scroll==='vertical' ? `translate(0 ${scrollOffset-bodyStart})` : ''}>
          {#each bodyLayout.lines as line, index}
            <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={alignedX(rich.alignment,bodyLeft,bodyWidth)} y={bodyStart+(index+1)*bodyLayout.lineHeight} text-anchor={textAnchor(rich.alignment)} textLength={rich.alignment === 'justify' && !line.lastInParagraph ? bodyWidth : undefined} lengthAdjust="spacing" xml:space="preserve" font-family={fontFamily} font-size={bodySize} fill={textColor(element,'line1','white')} font-weight={rich.bodyBold?'800':'400'} font-style={rich.bodyItalic?'italic':'normal'} text-decoration={rich.bodyUnderline?'underline':'none'}>
              {#each line.runs as run}<tspan font-weight={run.bold?'800':(rich.bodyBold?'800':'400')} font-style={run.italic?'italic':(rich.bodyItalic?'italic':'normal')} text-decoration={run.underline||rich.bodyUnderline?'underline':'none'}>{run.text}</tspan>{/each}
            </text>
          {/each}
        </g>
      {/if}
    </g>
  {:else if slide}
    <path d={`M14 0 H${w-32} L${w} 26 V${height-20} Q${w} ${height} ${w-20} ${height} H16 Q0 ${height} 0 ${height-16} V14 Q0 0 14 0Z`} fill={bg} fill-opacity=".97" stroke={paint.edge} stroke-width="3"/>
    <path d={`M16 1 H${Math.min(w*.38,230)}`} stroke={accent} stroke-width="5"/>
    <path d={`M${w-120} ${height-1} h82 l25 -21`} stroke={accent} stroke-width="3" fill="none"/>
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x="34" y={height*.2} font-size={Math.min(20*textFactor,height*.14)} fill={textColor(element,'heading','secondary')} font-weight="800" letter-spacing="3">{fields.heading}</text>
    <path d={`M34 ${height*.27} H${Math.min(w-38,520)}`} stroke={paint.edge} stroke-width="2"/>
    <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x="34" y={height*.59} font-size={scaledText(fields.line1,Math.min(size,height*.35),w-70)} fill={textColor(element,'line1','white')} font-weight="800">{fields.line1}</text>
    <text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x="34" y={height*.90} font-size={Math.min(23*textFactor,height*.14)} fill={textColor(element,'line2','secondary')}>{fields.line2}</text>
  {:else}
    <path d={`M14 0 H${w-28} L${w} 25 V${height-17} Q${w} ${height} ${w-17} ${height} H14 Q0 ${height} 0 ${height-14} V14 Q0 0 14 0Z`} fill={bg} fill-opacity=".98" stroke={paint.edge} stroke-width="2.5"/>
    <path d={`M14 1 H${Math.min(w*.4,185)}`} stroke={accent} stroke-width="5"/>
    <path d={`M${w-95} ${height-1} h55 l20 -18`} stroke={accent} stroke-width="2.5" fill="none"/>
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={studioTextX} y={height*.25} fill={textColor(element,'heading','secondary')} font-family={fontFamily} font-size={Math.min(20*textFactor,height*.18)} font-weight="800" letter-spacing="2.5">{fields.heading}</text>
    <path d={`M30 ${height*.34} H${Math.min(w-48,440)}`} stroke={paint.edge} stroke-width="2"/>
    <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={studioTextX} y={cardTextY.main} fill={textColor(element,'line1','white')} font-family={fontFamily} font-size={scaledText(fields.line1,Math.min(size,height*.36),studioTextWidth)} font-weight="800">{fields.line1}</text>
    {#if fields.line2}<text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x={studioTextX} y={cardTextY.secondary} fill={textColor(element,'line2','secondary')} font-size={Math.min(21*textFactor,height*.17)}>{fields.line2}</text>{/if}
  {/if}
  {#if studioCard}
    <!-- Reaproveita o desenho dos ícones 0.14; fica dentro da área reservada à esquerda. -->
    <g transform={`translate(18 ${Math.max(8,(height-60)/2)})`} pointer-events="none">
      <rect x="0" y="0" width="60" height="60" rx="12"
        fill={paint.edge} fill-opacity=".32" stroke={accent} stroke-width="1.7"/>
      <svg x="9" y="9" width="42" height="42" viewBox="0 0 24 24"
        preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d={CARD_ICONS[element.kind] || CARD_ICONS.default} fill="none"
          stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </g>
  {/if}
  {#if studioShineVisible}
    <defs>
      <clipPath id={`card-shine-${id}`}>
        <rect width={w} height={height} rx="15"/>
      </clipPath>
    </defs>
    <g clip-path={`url(#card-shine-${id})`} pointer-events="none"
      opacity={.17 * Math.sin(Math.PI * shineElapsed)}>
      <path d={`M${-90 + shineElapsed * (w + 180)} 0 l65 ${height} h18 l-65 -${height} Z`}
        fill="#ffffff"/>
    </g>
  {/if}
</g>
