<script lang="ts">
  import { BRAND, TECHNICAL_CAPTIONS } from '../lib/brand';
  import { CARD_ICONS } from '../lib/cardIcons';
  import { palettePaint, textColor } from '../lib/palette';
  import type { TextColorKey, TextColorRole } from '../lib/types';
  import LegacyShape from './LegacyShape.svelte';
  import BottomTechnical from './BottomTechnical.svelte';
  import ShineOverlay from './ShineOverlay.svelte';
  import DiagonalGlow from './DiagonalGlow.svelte';
  import SocialIcon from './SocialIcon.svelte';
  import { fontStack } from '../lib/fonts';
  import type { HudElement } from '../lib/types';
  import { fieldTextStyle } from '../lib/inlineText';
  import { elementBaseHeight, isBar, isCompactCartela, compactCardTextBaselines } from '../lib/geometry';
  import { clamp } from '../lib/timing';
  import { technicalRowTextX, technicalTextAvailableWidth } from '../lib/technicalGeometry';
  import { DEFAULT_RICH_TEXT, layoutRichText, parseRuns, alignedX, textAnchor, type MeasureRich } from '../lib/richtext';
  import { compactTextWeights, singleLineText } from '../lib/compactText';
  import { visualMotionFrame } from '../lib/visualAnimation';

  export let element: HudElement;
  export let canvasHeight = 1080;
  export let canvasWidth = 1920;
  export let time = 0;
  export let duration = 5.3;

  $: portraitBottom = canvasHeight > canvasWidth && isBar(element);
  $: fontFamily = fontStack(element.style.fontFamily);
  // Formato e aparência são independentes: o seletor Studio/Clássico decide o renderizador
  // para TODAS as categorias, inclusive barras, tela cheia e texto livre legado.
  $: shouldUseLegacy = element.visualPreset === 'legacy';
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
  $: fullTech = (element.kind === 'technical' && ['fullscreen','legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && element.freeTextStyle === 'fullTechnical');
  $: fullPage = element.kind === 'freeText' && ['fullPage','legacyPresentationSlide'].includes(element.freeTextStyle || '');
  $: studioWideBar = element.kind === 'freeText' && ['legacyHalfBar','legacyFullBar'].includes(element.freeTextStyle || '');
  $: studioPresentationBar = element.kind === 'freeText' && element.freeTextStyle === 'legacyPresentationBar';
  $: isRight = (element.technicalSide || 'left') === 'right';
  $: credit = element.kind === 'credit';
  // As cartelas compactas Studio reutilizam os ícones vetoriais originais.
  $: studioCard = !shouldUseLegacy && ['location','date','route','driver','credit'].includes(element.kind);
  // A linha interna só começa após o espaço reservado ao ícone.
  const cardIconX = 18;
  const cardIconSize = 60;
  const cardIconGap = 22;
  $: studioRuleX = studioCard ? cardIconX + cardIconSize + cardIconGap : 30;
  $: studioTextX = studioCard ? 100 : 30;
  $: studioTextWidth = Math.max(90, w - studioTextX - 34);
  // O recorte coincide com a arte, não com uma moldura retangular genérica.
  $: studioShineShape = technical ? panelPath : fullTech || fullPage || credit ? '' :
    (freeText && element.freeTextStyle==='classic') || slide
      ? `M14 0 H${w-32} L${w} 26 V${height-20} Q${w} ${height} ${w-20} ${height} H16 Q0 ${height} 0 ${height-16} V14 Q0 0 14 0Z`
      : `M14 0 H${w-28} L${w} 25 V${height-17} Q${w} ${height} ${w-17} ${height} H14 Q0 ${height} 0 ${height-14} V14 Q0 0 14 0Z`;
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
  $: titleX = isRight ? technicalRowTextX(w,height,111*sy,true) : 52;
  $: innerX = isRight ? technicalRowTextX(w,height,rowStart+32,true) : 92;
  $: innerRight = isRight ? w - 124 : w - 110;
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
  $: freeSocial = freeText && (element.freeTextIcon || 'none') !== 'none' && ['classic','legacyLabel','legacyHalfBar','legacyFullBar','legacyPresentationBar'].includes(element.freeTextStyle || '');
  $: compactWeights = compactTextWeights(element.freeTextDisplay, time, duration);
  $: compactLine1 = singleLineText(fields.line1);
  $: compactLine2 = singleLineText(fields.line2);
  $: compactLabelX = freeSocial ? 104 : 28;
  $: compactLabelWidth = Math.max(30, w - compactLabelX - 28);
  $: bodyLeft = fullPage ? fullMargin : freeSocial ? 100 : 34;
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
  $: motionVariant = technical || technicalAlpha1 ? 'technical' : fullTech || fullPage ? 'fullscreen' : corner ? 'corner' : 'label';
  $: studioMotion = visualMotionFrame(element.animation,time,duration,motionVariant,activeTechnical.length);
  $: studioGold = studioMotion.gold;
  $: studioHeadingAlpha = studioMotion.title;
  $: studioValueAlpha = studioMotion.value;
  $: studioRowReveals = studioMotion.rows;
  $: studioMaskId = `studio-motion-mask-${id}`;
  $: studioMaskGradientId = `studio-motion-gradient-${id}`;
  $: studioScrollDistance = Math.max(0,time-.50) * (rich.scrollPixelsPerSecond || 200);
  $: studioLineWidth1 = measureRich(compactLine1, Math.min(size,height*.33), true, false);
  $: studioLineWidth2 = measureRich(compactLine2, Math.min(size*.72,height*.24), false, false);
  $: studioFront = -38 + studioMotion.panel * (w+76);
  $: studioStop1 = clamp((studioFront-26)/Math.max(1,w)*100,0,100);
  $: studioStop2 = clamp((studioFront+26)/Math.max(1,w)*100,studioStop1,100);
  $: studioUseWipe = studioMotion.active && motionVariant === 'label';
  $: studioWrapperOpacity = studioMotion.active && motionVariant !== 'label' ? Math.min(1,studioMotion.panel*3) : 1;
  $: studioWrapperTransform = studioMotion.active && motionVariant === 'technical'
    ? `translate(${(isRight?1:-1)*(1-studioMotion.panel)*(w+40)} 0)`
    : studioMotion.active && motionVariant === 'corner'
      ? `translate(${w/2+studioMotion.corner.offset} ${height/2}) scale(${studioMotion.corner.scale}) translate(${-w/2} ${-height/2})`
      : undefined;
  $: marquee = parseRuns(fields.line1.replace(/\n/g, ' · '));
  $: marqueeWidth = lineWidth(marquee,bodySize,rich.bodyBold,rich.bodyItalic);
  $: marqueeX = w - bodyLeft - scrollProgress * (marqueeWidth + w);
</script>

<g font-family={fontFamily}>
  {#if portraitBottom}
    <BottomTechnical {element} {time} {duration}/>
  {:else if shouldUseLegacy}
    <LegacyShape {element} {time} {duration} {canvasWidth} {canvasHeight}/>
  {:else}
    <defs>
      <linearGradient id={studioMaskGradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
        <stop offset={`${studioStop1}%`} stop-color="white"/>
        <stop offset={`${studioStop2}%`} stop-color="black"/>
      </linearGradient>
      <mask id={studioMaskId} maskUnits="userSpaceOnUse" x="-40" y="-40" width={w+80} height={height+80}>
        <rect width={w} height={height} fill={`url(#${studioMaskGradientId})`}/>
      </mask>
    </defs>
    <g mask={studioUseWipe?`url(#${studioMaskId})`:undefined}
       opacity={studioWrapperOpacity} transform={studioWrapperTransform}>
      {#if technical}
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
      <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={titleX} y={111*sy} fill={textColor(element,'heading','primary')} font-family={fontFamily} font-weight="800" font-size={scaledText(fields.heading, (isRight?32:36) * textFactor, Math.max(80,(isRight?innerRight-titleX:contentWidth) - fields.heading.length*5-14))} letter-spacing="5">{fields.heading}</text>
      <path d={`M${titleX} ${132*sy} H${innerRight}`} stroke={paint.edge} stroke-width="2"/>
      <path d={`M${titleX} ${132*sy} H${titleX + Math.min(115, contentWidth*.35)}`} stroke={accent} stroke-width="3"/>
      {#each technicalValues as value, index}
        {#if value}
          {@const y = rowStart + index * rowStep}
          {@const rowX = isRight ? technicalRowTextX(w,height,y+26,true) : innerX}
          {@const rowWidth = isRight ? technicalTextAvailableWidth(w,height,y+26,true)-6 : contentWidth}
          <path d={`M${rowX - 44} ${y + 3} l12 13 -12 13 M${rowX - 30} ${y+3} l12 13 -12 13`} stroke={accent} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <text data-edit-caption={index} style={fieldTextStyle(element,'caption'+index)} x={rowX} y={y+3} fill={textColor(element,('caption'+index) as TextColorKey,'secondary')} font-family={fontFamily} font-weight="800" font-size={scaledText(captions[index] || '', Math.min((isRight?15:17)*textFactor, rowStep*.21), Math.max(60,rowWidth-(captions[index] || '').length*3))} letter-spacing="3">{captions[index] || ''}</text>
          <text data-edit-field={'line'+(index+1)} style={fieldTextStyle(element,'line'+(index+1))} x={rowX} y={y+Math.min(42*sy,rowStep*.52)} fill={textColor(element,('line'+(index+1)) as TextColorKey,'white')} font-family={fontFamily} font-weight="800" font-size={scaledText(value, Math.min(size, rowStep*.43, isRight?34*textFactor:1000), rowWidth)}>{value}</text>
          <path d={`M${rowX} ${y + rowStep*.7} H${innerRight}`} stroke={paint.edge} stroke-width="2"/>
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
  {:else if freeText && element.freeTextStyle === 'legacyLabel'}
    <!-- Modelo Studio da etiqueta: mantém dois campos de uma linha e espaço próprio para o ícone. -->
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
        <stop stop-color={paint.background}/><stop offset="1" stop-color={bg}/>
      </linearGradient>
      <clipPath id={contentClipId}><rect x={compactLabelX} y="6" width={compactLabelWidth} height={Math.max(12,height-12)}/></clipPath>
    </defs>
    <rect x="1.5" y="1.5" width={Math.max(1,w-3)} height={Math.max(1,height-3)} rx="15" fill={`url(#${gradId})`} fill-opacity=".98" stroke={paint.edge} stroke-width="2.5"/>
    <path d={`M13 1.5 H${Math.min(w*.42,230)}`} stroke={accent} stroke-width="4"/>
    <rect x="9" y={height*.25} width="4" height={height*.5} rx="2" fill={accent} fill-opacity=".9"/>
    {#if compactWeights.stacked}
      <path d={`M${compactLabelX} ${height*.54} H${w-24}`} stroke={accent} stroke-width="1" stroke-opacity=".4"/>
    {/if}
    {#if freeSocial}<SocialIcon icon={element.freeTextIcon || 'none'} x={24} y={Math.max(10,height/2-26)} size={52} color={accent} framed={true}/>{/if}
    <g clip-path={`url(#${contentClipId})`}>
      <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={compactLabelX} y={compactWeights.stacked?height*.42:height*.66} opacity={compactWeights.first} fill={textColor(element,'line1','white')} font-family={fontFamily} font-weight="800" font-size={scaledText(compactLine1,Math.min(size,height*(compactWeights.stacked ? .32 : .42)),compactLabelWidth)}>{compactLine1}</text>
      {#if compactLine2}
        <text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x={compactLabelX} y={compactWeights.stacked?height*.86:height*.66} opacity={compactWeights.second} fill={textColor(element,'line2','secondary')} font-family={fontFamily} font-size={scaledText(compactLine2,Math.min(size*(compactWeights.stacked ? .75 : 1),height*(compactWeights.stacked ? .22 : .40)),compactLabelWidth)}>{compactLine2}</text>
      {/if}
    </g>
  {:else if studioWideBar}
    <!-- Barras largas Studio: não reutilizam a geometria do Clássico 0.14. -->
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
        <stop stop-color={paint.background}/><stop offset="1" stop-color={bg}/>
      </linearGradient>
      <clipPath id={contentClipId}><rect x={freeSocial?112:32} y="7" width={Math.max(32,w-(freeSocial?152:72))} height={Math.max(12,height-14)}/></clipPath>
    </defs>
    <rect x="2" y="2" width={Math.max(1,w-4)} height={Math.max(1,height-4)} rx="20"
      fill={`url(#${gradId})`} stroke={paint.edge} stroke-width="2.5" fill-opacity=".97"/>
    <rect x="9" y={height*.20} width="5" height={height*.60} rx="2.5" fill={accent}/>
    <path d={`M28 2 H${Math.min(w*.38,290)}`} stroke={accent} stroke-width="4" fill="none"/>
    <path d={`M${w-110} ${height-4} h79 l18 -17`} stroke={paint.edge} stroke-width="2.5" fill="none"/>
    {#if freeSocial}
      <g opacity={studioMotion.iconOpacity} transform={`translate(49 ${height/2}) scale(${studioMotion.iconScale}) translate(-49 ${-height/2})`}>
        <SocialIcon icon={element.freeTextIcon || 'none'} x={23} y={Math.max(12,height/2-26)} size={52} color={accent} framed={true}/>
      </g>
    {/if}
    <g clip-path={`url(#${contentClipId})`}>
      {#if rich.scrollLine1}
        {#each Array.from({length:Math.max(1,Math.min(20,rich.scrollRepeats||1))},(_,i)=>i) as i}
          <text data-edit-field="line1" opacity={studioValueAlpha} x={w-30-studioScrollDistance+i*(studioLineWidth1+(rich.scrollGap||240))}
            y={height*.43} font-size={Math.min(size,height*.33)} font-weight="800" fill={textColor(element,'line1','white')}>{compactLine1}</text>
        {/each}
      {:else}
        <text data-edit-field="line1" opacity={studioValueAlpha} x={freeSocial?114:34} y={height*.43}
          font-size={scaledText(compactLine1,Math.min(size,height*.33),Math.max(32,w-(freeSocial?162:84)))}
          font-family={fontFamily} font-weight="800" fill={textColor(element,'line1','white')}>{compactLine1}</text>
      {/if}
      <path d={`M${freeSocial?112:32} ${height*.54} H${w-36}`} stroke={accent} stroke-width="1" stroke-opacity=".35" opacity={studioGold}/>
      {#if rich.scrollLine2}
        {#each Array.from({length:Math.max(1,Math.min(20,rich.scrollRepeats||1))},(_,i)=>i) as i}
          <text data-edit-field="line2" opacity={studioValueAlpha} x={w-30-studioScrollDistance+i*(studioLineWidth2+(rich.scrollGap||240))}
            y={height*.83} font-size={Math.min(size*.72,height*.24)} fill={textColor(element,'line2','secondary')}>{compactLine2}</text>
        {/each}
      {:else if compactLine2}
        <text data-edit-field="line2" opacity={studioValueAlpha} x={freeSocial?114:34} y={height*.83}
          font-size={scaledText(compactLine2,Math.min(size*.72,height*.24),Math.max(32,w-(freeSocial?162:84)))}
          font-family={fontFamily} fill={textColor(element,'line2','secondary')}>{compactLine2}</text>
      {/if}
    </g>
  {:else if freeText && (element.freeTextStyle === 'classic' || studioPresentationBar)}
    <defs><clipPath id={contentClipId}><rect x="30" y={bodyStart} width={w-60} height={bodyAreaHeight}/></clipPath></defs>
    <path d={`M14 0 H${w-32} L${w} 26 V${height-20} Q${w} ${height} ${w-20} ${height} H16 Q0 ${height} 0 ${height-16} V14 Q0 0 14 0Z`} fill={bg} fill-opacity=".97" stroke={paint.edge} stroke-width="3"/>
    <path d={`M16 1 H${Math.min(w*.38,230)}`} stroke={accent} stroke-width="5"/>
    <path d={`M${w-120} ${height-1} h82 l25 -21`} stroke={accent} stroke-width="3" fill="none"/>
    {#if freeSocial}<SocialIcon icon={element.freeTextIcon || 'none'} x={20} y={Math.max(12,height/2-28)} size={56} color={accent} framed={true}/>{/if}
    <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={freeSocial?100:34} y={42*sy} font-size={scaledText(fields.heading,Math.min(headingSize,height*.24),w-70)} fill={textColor(element,'heading','secondary')} font-family={fontFamily} font-weight={rich.titleBold?'800':'400'} font-style={rich.titleItalic?'italic':'normal'} text-decoration={rich.titleUnderline?'underline':'none'} letter-spacing="3">{fields.heading}</text>
    <path d={`M${freeSocial?100:34} ${58*sy} H${Math.min(w-38,520)}`} stroke={paint.edge} stroke-width="2"/>
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
    <path d={`M${studioRuleX} ${height*.34} H${Math.max(studioRuleX,Math.min(w-48,440))}`} stroke={paint.edge} stroke-width="2"/>
    <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={studioTextX} y={cardTextY.main} fill={textColor(element,'line1','white')} font-family={fontFamily} font-size={scaledText(fields.line1,Math.min(size,height*.36),studioTextWidth)} font-weight="800">{fields.line1}</text>
    {#if fields.line2}<text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x={studioTextX} y={cardTextY.secondary} fill={textColor(element,'line2','secondary')} font-size={Math.min(21*textFactor,height*.17)}>{fields.line2}</text>{/if}
  {/if}
  {#if studioCard}
    <!-- Reaproveita o desenho dos ícones 0.14; fica dentro da área reservada à esquerda. -->
    <g transform={`translate(${cardIconX} ${Math.max(8,(height-cardIconSize)/2)})`} pointer-events="none">
      <rect x="0" y="0" width={cardIconSize} height={cardIconSize} rx="12"
        fill={paint.edge} fill-opacity=".32" stroke={accent} stroke-width="1.7"/>
      <svg x="9" y="9" width="42" height="42" viewBox="0 0 24 24"
        preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d={CARD_ICONS[element.kind] || CARD_ICONS.default} fill="none"
          stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </g>
  {/if}
  {#if !shouldUseLegacy && !portraitBottom && !corner}
    {#if isCompactCartela(element) || (freeText && element.freeTextStyle==='classic')}
      <ShineOverlay id={`studio-${id}`} {time} {duration} width={w} height={height}
        shape={studioShineShape} radius={credit?15:0} kind="card"
        enabled={element.shineEnabled!==false}/>
    {/if}
    {#if technical}
      <DiagonalGlow id={`studio-${id}`} {time} {duration} width={w} height={height}
        shape={panelPath} path={edgePath}
        secondaryPath={isRight?`M104 0 L20 ${height}`:`M${w-105} 0 L${w-20} ${height}`}
        enabled={element.diagonalGlowEnabled===true}
        intensity={element.diagonalGlowIntensity ?? 170}/>
    {/if}
    </g>
  {/if}
</g>
