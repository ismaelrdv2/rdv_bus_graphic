<script lang="ts">
  import type { HudElement } from '../lib/types';
  import { fieldTextStyle } from '../lib/inlineText';
  import { fontStack } from '../lib/fonts';
  import { BRAND, TECHNICAL_CAPTIONS } from '../lib/brand';
  import { CARD_ICONS } from '../lib/cardIcons';
  import ShineOverlay from './ShineOverlay.svelte';
  import DiagonalGlow from './DiagonalGlow.svelte';
  import SocialIcon from './SocialIcon.svelte';
  import { palettePaint, textColor } from '../lib/palette';
  import type { TextColorKey, TextColorRole } from '../lib/types';
  import { elementBaseHeight, compactCardTextBaselines, isCompactCartela } from '../lib/geometry';
  import { technicalSeparatorEnd, technicalTextX, technicalTextRightEdge, technicalRowTextX, technicalTextAvailableWidth } from '../lib/technicalGeometry';
  import { clamp } from '../lib/timing';
  import { legacyPhase, legacyStage, legacyScrollDistance, legacyLabelMotion, legacyTechnicalEntrance, legacyCornerMotion } from '../lib/legacy';
  import { compactTextWeights, singleLineText } from '../lib/compactText';
  import { DEFAULT_RICH_TEXT, layoutRichText, alignedX, textAnchor, type MeasureRich } from '../lib/richtext';

  export let element: HudElement;
  export let time = 0;
  export let duration = 5.3;
  export let canvasHeight = 1080;
  export let canvasWidth = 1920;

  $: fontFamily = fontStack(element.style.fontFamily);
  $: w = element.style.width * element.style.scaleX;
  $: h = elementBaseHeight(element, canvasHeight) * element.style.scaleY;
  $: sideRight = element.technicalSide === 'right';
  $: isTech = element.kind === 'technical' || element.freeTextStyle === 'technicalBar' || element.freeTextStyle === 'fullTechnical';
  $: fullTech = (element.kind === 'technical' && element.technicalLayout === 'legacyFullscreen') || (element.kind === 'freeText' && element.freeTextStyle === 'fullTechnical');
  $: fullSlide = element.kind === 'freeText' && element.freeTextStyle === 'legacyPresentationSlide';
  $: isFull = fullTech || fullSlide;
  $: isTechSide = isTech && !fullTech;
  $: techShape=sideRight?`M84 0 H${w} V${h} H0 Z`:`M0 0 H${w-84} L${w} ${h} H0 Z`;
  $: diagonalPath=sideRight?`M84 0 L0 ${h}`:`M${w-84} 0 L${w} ${h}`;
  $: diagonalInner=sideRight?`M101 0 L17 ${h}`:`M${w-101} 0 L${w-17} ${h}`;
  $: legacyShineShape=isTechSide?techShape:isFull?'':
    `M16 0 H${w-22} L${w} 22 V${h-20} Q${w} ${h} ${w-20} ${h} H16 Q0 ${h} 0 ${h-16} V16 Q0 0 16 0Z`;
  $: freeBarPresentation = element.kind === 'slide' || (element.kind === 'freeText' && element.freeTextStyle === 'legacyPresentationBar');
  $: freeLabel = element.kind === 'freeText' && ['legacyLabel','legacyHalfBar','legacyFullBar'].includes(element.freeTextStyle || '');
  $: compactLabel = element.kind === 'freeText' && element.freeTextStyle === 'legacyLabel';
  $: labelWeights = compactTextWeights(compactLabel ? element.freeTextDisplay : 'both', time, duration);
  // Ícones desenhados no mesmo sistema 24x24; o viewBox garante alinhamento
  // independente de altura do caminho (o pin antes ultrapassava a moldura).
  $: isSmallLabel = !isTech && !fullSlide && !freeBarPresentation && !freeLabel;
  $: cardTextY = compactCardTextBaselines(h);
  $: fields = element.fields;
  $: paint = palettePaint(element.style);
  $: accent = element.style.accent;
  $: background = element.style.background;
  $: rich = element.richText || DEFAULT_RICH_TEXT;
  $: id = element.id.replace(/[^a-zA-Z0-9_-]/g, '');
  $: clipId = `old-clip-${id}`;
  $: gradientId = `old-gradient-${id}`;
  $: cardGradientId = `old-card-${id}`;
  $: contentClipId = `old-content-${id}`;
  $: slideBodyClipId = `old-slide-body-${id}`;
  $: panelWipeId = `old-panel-wipe-${id}`;
  $: panelWipeGradientId = `old-panel-wipe-gradient-${id}`;
  $: goldRevealId = `old-gold-reveal-${id}`;
  $: goldBlurId = `old-gold-blur-${id}`;
  $: portrait = canvasHeight > canvasWidth;
  // V6 Python: cada campo da ficha acrescenta 90 ms à revelação.
  // Composição continua respeitando a duração total escolhida no Studio.
  $: visibleTechnicalRows = Math.max(1, values.filter(value => value.trim().length > 0).length);
  $: technicalDuration = legacyTechnicalEntrance(visibleTechnicalRows);
  $: enterDuration = isTech ? technicalDuration : element.kind === 'corner' ? .65 : .80;
  $: exitDuration = isTech ? .60 : element.kind === 'corner' ? .45 : .50;
  $: phase = element.animation === 'legacy' ? legacyPhase(time, duration, enterDuration, exitDuration) : enterDuration;
  $: stage = (start: number, length: number) => legacyStage(phase, start, length);
  $: labelMotion = legacyLabelMotion(phase);
  $: cornerMotion = legacyCornerMotion(phase);
  $: cornerDirection = element.style.x + w / 2 < canvasWidth / 2 ? -1 : 1;
  $: pPanel = isTech || isFull ? stage(0, .55) : labelMotion.panel;
  $: pTitle = isTech ? stage(.40, .30) : isFull ? stage(.22, .34) : labelMotion.label;
  $: pRule = isTech ? stage(.50, .40) : isFull ? stage(.36, .40) : labelMotion.gold;
  $: pBody = isTech ? stage(.55, .32) : isFull ? stage(.54, .45) : labelMotion.value;
  $: pFooter = isTech ? stage(.55 + .09 * visibleTechnicalRows, .30) : stage(.63, .25);
  $: pIconScale = labelMotion.iconScale;
  $: pIconOpacity = labelMotion.iconOpacity;
  // Wipe do pacote Python: área revelada com borda suavizada de ~36 px.
  $: wipeEdge = -36 + pPanel * (w + 72);
  $: wipeStart = clamp((wipeEdge - 26) / Math.max(1, w) * 100, 0, 100);
  $: wipeEnd = clamp((wipeEdge + 26) / Math.max(1, w) * 100, wipeStart, 100);
  $: direction = sideRight ? 1 : -1;
  $: margin = portrait ? 72 : 82;
  $: columns = portrait ? 2 : 4;
  $: gap = 24;
  $: values = [fields.line1, fields.line2, fields.line3, fields.line4, fields.line5, fields.line6];
  $: captions = element.kind === 'freeText' ? (element.freeTextCaptions || TECHNICAL_CAPTIONS) : (element.technicalCaptions || TECHNICAL_CAPTIONS);
  $: rows = Math.ceil(values.length / columns);
  $: gridTop = portrait ? 320 : 230;
  $: cellW = (w - 2*margin - gap*(columns-1)) / columns;
  $: cellH = (h - gridTop - 125 - gap*(rows-1)) / rows;
  $: techRowStart = h * .214;
  $: techRowPitch = Math.min(142, (h - techRowStart - 140) / 6);
  $: technicalX = technicalTextX(sideRight);
  $: technicalTitleX = sideRight ? technicalRowTextX(w,h,h*.115,true) : 52;
  $: technicalFooterX = sideRight ? technicalRowTextX(w,h,h-48,true) : 52;
  $: techRightLimit = technicalTextRightEdge(w, sideRight);
  $: technicalSeparatorEnds = Array.from({ length: 6 }, (_, i) =>
    technicalSeparatorEnd(w, h, techRowStart + i*techRowPitch + 70, sideRight));
  $: fontScale = clamp(Math.sqrt(element.style.scaleX * element.style.scaleY), .35, 2.5);
  $: fSize = element.style.fontSize * fontScale;
  $: typeSize = Math.min(34, h * .3, fSize);
  $: freeSocial = element.kind === 'freeText' && (element.freeTextIcon || 'none') !== 'none' && (freeLabel || freeBarPresentation);
  $: clipStart = freeSocial ? 92 : 32;
  $: clipWidth = Math.max(45, w-clipStart-32);
  $: bodyTitleSize = Math.min(rich.titleSize*fontScale, fullSlide?95:48);
  // Usa uma área de recorte e uma linha de base compartilhadas: o texto não
  // pode começar acima do clipPath (cortava o topo das letras no slide).
  $: slideClipTop = portrait ? 595 : 490;
  $: slideClipHeight = Math.max(55, h - slideClipTop - 175);
  $: bodyFontSize = fitBody(fields.line1, Math.max(120,w-2*margin-130), fullSlide ? Math.max(40,slideClipHeight-12) : Math.max(50,h*.34), Math.min(rich.bodySize*fontScale, fullSlide?60:44));
  $: slideBodyBaseline = slideClipTop + bodyFontSize * 1.05 + 8;
  // A apresentação em barra separa o corpo do divisor e reserva espaço
  // para uma eventual segunda linha.
  $: barBodyBaseline = Math.max(h*.66, h*.39 + bodyFontSize*1.16);
  $: line1Text = compactLabel ? singleLineText(fields.line1 || '') : fields.line1 || '';
  $: line2Text = compactLabel ? singleLineText(fields.line2 || '') : fields.line2 || '';
  $: speed = rich.scrollPixelsPerSecond || 200;
  $: repeatCount = Math.round(clamp(rich.scrollRepeats || 1, 1, 20));
  $: scrollGap = rich.scrollGap || 240;
  $: scrollDistance = legacyScrollDistance(time, speed);
  $: lineWidth1 = measure(line1Text, typeSize, true, false);
  $: lineWidth2 = measure(line2Text, typeSize*.68, false, false);
  $: activeScroll1 = freeLabel && rich.scrollLine1;
  $: activeScroll2 = freeLabel && rich.scrollLine2;
  $: startScroll = w - 32;
  $: bodyLayout = layoutRichText(fields.line1, Math.max(120,w-2*margin-150), bodyFontSize, 1.38, rich.bullets, rich.bodyBold, rich.bodyItalic, measure);
  let ctx: CanvasRenderingContext2D | null = null;
  const measure: MeasureRich = (text, size, bold, italic=false) => {
    if (typeof document === 'undefined') return [...text].length * size * .58;
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return [...text].length * size * .58;
    ctx.font = `${italic?'italic ':''}${bold?'800':'400'} ${size}px ${fontFamily}`;
    return ctx.measureText(text).width;
  };
  function fit(text: string, wanted: number, max: number, bold=true): number {
    const width = measure(text, wanted, bold, false);
    return width > max ? Math.max(10, wanted * max / width * .98) : wanted;
  }
  function fitBody(text: string, lineWidth: number, maxHeight: number, initial: number): number {
    let testSize = initial;
    while (testSize > 18) {
      const layout = layoutRichText(text,lineWidth,testSize,1.38,rich.bullets,rich.bodyBold,rich.bodyItalic,measure);
      if (layout.contentHeight <= maxHeight) break;
      testSize -= 2;
    }
    return testSize;
  }
  // Atualiza os progressos de cada campo quando phase muda. A chamada indireta
  // a rowProgress() dentro de {@const} não é reativa em Svelte.
  $: rowReveals = Array.from({ length: 6 }, (_, i) => legacyStage(phase, .55 + .09 * i, .32));
  function lineY(n: number): number { return (freeLabel ? (labelWeights.stacked ? (n === 0 ? h*.43 : h*.85) : h*.66) : h*.67); }
</script>

<g font-family={fontFamily}>
  <defs>
    <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
      <stop stop-color={paint.background}/><stop offset=".7" stop-color={background}/><stop offset="1" stop-color={paint.dark}/>
    </linearGradient>
    <linearGradient id={cardGradientId} x1="0" x2="1" y1="0" y2="1">
      <stop stop-color={paint.background}/><stop offset="1" stop-color={background}/>
    </linearGradient>
    <linearGradient id={panelWipeGradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
      <stop offset={`${wipeStart}%`} stop-color="white"/>
      <stop offset={`${wipeEnd}%`} stop-color="black"/>
    </linearGradient>
    <mask id={panelWipeId} maskUnits="userSpaceOnUse" x="-36" y="-36" width={w+72} height={h+72}>
      <rect x="0" y="0" width={w} height={h} fill={`url(#${panelWipeGradientId})`}/>
    </mask>
    <clipPath id={goldRevealId}><rect x="-4" y="-10" width={Math.max(0, 170 * pRule + 4)} height="34"/></clipPath>
    <filter id={goldBlurId} x="-35%" y="-450%" width="170%" height="1000%"><feGaussianBlur stdDeviation="5"/></filter>
    <clipPath id={contentClipId}><rect x={clipStart} y="0" width={clipWidth} height={h}/></clipPath>
    <clipPath id={slideBodyClipId}><rect x={margin+55} y={slideClipTop} width={Math.max(80,w-2*margin-110)} height={slideClipHeight}/></clipPath>
    <clipPath id={clipId}>
      <path d={sideRight ? `M84 0 H${w} V${h} H0 Z` : `M0 0 H${w-84} L${w} ${h} H0 Z`}/>
    </clipPath>
  </defs>

  {#if element.kind === 'corner'}
    <!-- O original mostrava o logotipo diretamente, sem a moldura Studio. -->
    <g opacity={cornerMotion.opacity} transform={`translate(${w/2 + cornerDirection * cornerMotion.offset} ${h/2}) scale(${cornerMotion.scale}) translate(${-w/2} ${-h/2})`}>
      {#if element.imageData}
        <image href={element.imageData} x="0" y="0" width={w} height={h} preserveAspectRatio="xMidYMid meet" />
      {:else}
        <rect x="1" y="1" width={w-2} height={h-2} rx="12" fill={background} fill-opacity=".75" stroke={accent} stroke-width="2" />
        <text x={w/2} y={h*.55} font-size={Math.min(20,h*.2)} text-anchor="middle" fill={textColor(element,'line1','white')}>INSERIR LOGOMARCA</text>
      {/if}
    </g>
  {:else if isTechSide}
    <g opacity={Math.min(1,pPanel*4)} transform={`translate(${direction*(1-pPanel)*(w+40)} 0)`}>
      <path d={sideRight ? `M84 0 H${w} V${h} H0 Z` : `M0 0 H${w-84} L${w} ${h} H0 Z`} fill={`url(#${gradientId})`} fill-opacity=".83" />
      <path d={sideRight ? `M84 0 L0 ${h}` : `M${w-84} 0 L${w} ${h}`} stroke={accent} stroke-width="4" fill="none"/>
      <path d={sideRight ? `M101 0 L17 ${h}` : `M${w-101} 0 L${w-17} ${h}`} stroke={paint.edge} stroke-width="2" fill="none"/>
    </g>
    <g clip-path={`url(#${clipId})`}>
      <g opacity={pTitle} transform={`translate(${direction*30*(1-pTitle)} 0)`}>
        <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={technicalTitleX} y={h*.115} fill={textColor(element,'heading','primary')} font-family={fontFamily} font-size={fit(fields.heading||'FICHA TÉCNICA', (sideRight?32:36)*fontScale, sideRight ? Math.max(60,techRightLimit-technicalTitleX-(fields.heading||'FICHA TÉCNICA').length*4-14) : w-180)} font-weight="800" letter-spacing="4">{fields.heading || 'FICHA TÉCNICA'}</text>
      </g>
      <g opacity={pRule}>
        <path d={`M${technicalTitleX} ${h*.132} h${(sideRight?techRightLimit-technicalTitleX-14:w-170)*pRule}`} stroke={accent} stroke-width="2.5" />
      </g>
      {#each values as value, i}
        {@const y = techRowStart + i*techRowPitch}
        {@const x = sideRight ? technicalRowTextX(w,h,y+32,true) : technicalX}
        {@const safeWidth = sideRight ? technicalTextAvailableWidth(w,h,y+32,true) : Math.max(36,w-x-50)}
        {@const progress = rowReveals[i]}
        {#if value}
          <g opacity={progress} transform={`translate(${direction*40*(1-progress)} 0)`}>
            <path d={`M${x-43} ${y+6} l11 13 -11 13 M${x-29} ${y+6} l11 13 -11 13`} stroke={accent} stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <text data-edit-caption={i} style={fieldTextStyle(element,'caption'+i)} x={x} y={y+10} fill={textColor(element,('caption'+i) as TextColorKey,'secondary')} font-family={fontFamily} font-size={fit(captions[i] || '', (sideRight?14:15)*fontScale, Math.max(45,safeWidth-(captions[i] || '').length*2.7), false)} font-weight="800" letter-spacing="2.7">{captions[i] || ''}</text>
            <text data-edit-field={'line'+(i+1)} style={fieldTextStyle(element,'line'+(i+1))} x={x} y={y+50} fill={textColor(element,('line'+(i+1)) as TextColorKey,'white')} font-family={fontFamily} font-size={fit(value, Math.min((sideRight?34:40)*fontScale,techRowPitch*.34), safeWidth)} font-weight="800">{value}</text>
            <path d={`M${x} ${y+70} H${technicalSeparatorEnds[i]}`} stroke={paint.edge} stroke-opacity=".65" stroke-width="1.6" />
          </g>
        {/if}
      {/each}
      <g opacity={pFooter}>
        <text x={technicalFooterX} y={h-48} font-size={15*fontScale} fill={textColor(element,'footer','secondary')} font-weight="800" letter-spacing="6">RDV BUS</text>
        <path d={`M${w-133} ${h-40} h35 l22 -18`} stroke={accent} stroke-width="2.5" fill="none"/>
      </g>
    </g>
  {:else if fullTech}
    <g opacity={pPanel}>
      <rect width={w} height={h} fill={`url(#${gradientId})`} fill-opacity=".88" />
      <path d={`M${margin} ${margin+58} V${margin} H${margin+180} M${w-margin-180} ${h-margin} H${w-margin} V${h-margin-58}`} fill="none" stroke={accent} stroke-width="3" />
      <path d={`M${margin} ${margin+80} V${h-margin-80} M${w-margin} ${margin+80} V${h-margin-80}`} fill="none" stroke={paint.edge} stroke-width="1.5" opacity=".55" />
    </g>
    <g opacity={pTitle} transform={`translate(0 ${35*(1-pTitle)})`}>
      <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={margin} y={portrait?205:152} fill={textColor(element,'heading','primary')} font-family={fontFamily} font-size={portrait?48:52} font-weight="800" letter-spacing="5">{fields.heading || 'FICHA TÉCNICA'}</text>
    </g>
    <path d={`M${margin} ${portrait?238:182} h${(w-2*margin)*pRule}`} fill="none" stroke={accent} stroke-width="2.5" opacity={pRule}/>
    {#each values as value, i}
      {@const col = i % columns}
      {@const row = Math.floor(i / columns)}
      {@const x = margin + col*(cellW+gap)}
      {@const y = gridTop + row*(cellH+gap)}
      {@const p = rowReveals[i]}
      {#if value}
        <g opacity={p} transform={`translate(0 ${26*(1-p)})`}>
          <path d={`M${x+20} ${y} H${x+cellW-20} L${x+cellW} ${y+20} V${y+cellH-20} Q${x+cellW} ${y+cellH} ${x+cellW-20} ${y+cellH} H${x+20} Q${x} ${y+cellH} ${x} ${y+cellH-20} V${y+20} Q${x} ${y} ${x+20} ${y} Z`} fill={`url(#${cardGradientId})`} fill-opacity=".52" stroke={paint.edge} stroke-width="2" />
          <path d={`M${x+25} ${y+18} v36 h57`} fill="none" stroke={accent} stroke-width="3" />
          <text data-edit-caption={i} style={fieldTextStyle(element,'caption'+i)} x={x+32} y={y+(portrait?110:94)} font-size={portrait?18:19} font-weight="800" fill={textColor(element,('caption'+i) as TextColorKey,'secondary')} letter-spacing="2.2">{(captions[i]||'').toUpperCase()}</text>
          <text data-edit-field={'line'+(i+1)} style={fieldTextStyle(element,'line'+(i+1))} x={x+32} y={y+(portrait?164:156)} font-family={fontFamily} font-size={fit(value, portrait?43:46,cellW-64)} font-weight="800" fill={textColor(element,('line'+(i+1)) as TextColorKey,'white')}>{value}</text>
        </g>
      {/if}
    {/each}
    <g opacity={pFooter}><text x={margin} y={h-54} font-size="17" fill={textColor(element,'footer','secondary')} letter-spacing="6" font-weight="800">RDV BUS</text><path d={`M${w-margin-160} ${h-62} H${w-margin-42} L${w-margin} ${h-102}`} stroke={accent} stroke-width="2" fill="none" /></g>
  {:else if fullSlide}
    <g opacity={pPanel}>
      <rect width={w} height={h} fill={`url(#${gradientId})`} fill-opacity=".9" />
      <path d={`M${margin} ${margin+58} V${margin} H${margin+180} M${w-margin-180} ${h-margin} H${w-margin} V${h-margin-58}`} fill="none" stroke={accent} stroke-width="3"/>
      <path d={`M${margin} ${margin+80} V${h-margin-80} M${w-margin} ${margin+80} V${h-margin-80}`} fill="none" stroke={paint.edge} opacity=".55" stroke-width="1.5"/>
    </g>
    <g opacity={pTitle} transform={`translate(0 ${35*(1-pTitle)})`}>
      <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={margin+65} y={portrait?235:185} fill={textColor(element,'heading','white')} font-size={fit(fields.heading,bodyTitleSize,w-2*margin-130)} font-family={fontFamily} font-weight={rich.titleBold?'800':'400'} font-style={rich.titleItalic?'italic':'normal'} text-decoration={rich.titleUnderline?'underline':'none'}>{fields.heading}</text>
    </g>
    <path d={`M${margin+65} ${portrait?405:327} h${(w-2*margin-130)*pRule}`} stroke={accent} stroke-width="3" opacity={pRule}/>
    <g opacity={pBody} transform={`translate(0 ${32*(1-pBody)})`}>
      <rect x={margin} y={portrait?470:375} width={w-2*margin} height={h-(portrait?470:375)-150} rx="20" fill={background} fill-opacity=".65" stroke={paint.edge} stroke-width="2" />
      <path d={`M${margin+34} ${portrait?505:410} v58 h78`} fill="none" stroke={paint.edge} stroke-width="3"/>
      <g clip-path={`url(#${slideBodyClipId})`}>
      {#each bodyLayout.lines as line, i}
        <text xml:space="preserve" data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={alignedX(rich.alignment,margin+65,w-2*margin-130)} y={slideBodyBaseline + i*bodyLayout.lineHeight} text-anchor={textAnchor(rich.alignment)} font-family={fontFamily} font-size={bodyFontSize} fill={textColor(element,'line1','secondary')} font-weight={rich.bodyBold?'800':'400'} font-style={rich.bodyItalic?'italic':'normal'} text-decoration={rich.bodyUnderline?'underline':'none'}>
          {#each line.runs as run}<tspan font-weight={run.bold?'800':rich.bodyBold?'800':'400'} font-style={run.italic?'italic':rich.bodyItalic?'italic':'normal'} text-decoration={run.underline||rich.bodyUnderline?'underline':'none'}>{run.text}</tspan>{/each}
        </text>
      {/each}
      </g>
    </g>
    <g opacity={pFooter}><text x={margin} y={h-54} font-size="17" fill={textColor(element,'footer','secondary')} letter-spacing="6" font-weight="800">RDV BUS</text><path d={`M${w-margin-160} ${h-62} H${w-margin-42} L${w-margin} ${h-102}`} stroke={accent} stroke-width="2" fill="none" /></g>
  {:else}
    <!-- Etiquetas / barras antigas: o painel e os detalhes entram por revelação,
         os textos chegam em tempos diferentes e podem rolar separadamente. -->
    <!-- Revelação horizontal + halo do RDV v6 (somente renderizador clássico). -->
    <g mask={`url(#${panelWipeId})`} opacity={Math.min(1,pPanel*3)}>
      <path d={`M16 0 H${w-22} L${w} 22 V${h-20} Q${w} ${h} ${w-20} ${h} H16 Q0 ${h} 0 ${h-16} V16 Q0 0 16 0Z`} fill={background} fill-opacity=".87" stroke={paint.edge} stroke-width="2" />
      <path d={`M${w-90} ${h-1} h45 l25 -18`} fill="none" stroke={accent} stroke-width="2.2" />
    </g>
    <g clip-path={`url(#${goldRevealId})`} opacity={pRule}>
      <path d={`M0 12 L16 0 H${Math.min(w*.4,165)}`} stroke={accent} stroke-width="11" opacity=".55" fill="none" filter={`url(#${goldBlurId})`}/>
      <path d={`M0 12 L16 0 H${Math.min(w*.4,165)}`} stroke={accent} stroke-width="3" fill="none" />
    </g>
    {#if freeSocial}
      <g opacity={pIconOpacity} transform={`translate(46 ${h/2}) scale(${pIconScale}) translate(-46 ${-h/2})`}><SocialIcon icon={element.freeTextIcon || 'none'} x={22} y={Math.max(12,h/2-24)} size={48} color={accent} framed={false}/></g>
    {/if}
    {#if freeBarPresentation}
      <g opacity={pTitle} transform={`translate(0 ${16*(1-pTitle)})`}>
        <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x={freeSocial?104:46} y={h*.31} fill={textColor(element,'heading','white')} font-size={fit(fields.heading,Math.max(25,bodyTitleSize),w-92)} font-weight={rich.titleBold?'800':'400'} font-style={rich.titleItalic?'italic':'normal'} text-decoration={rich.titleUnderline?'underline':'none'}>{fields.heading}</text>
      </g>
      <path d={`M${freeSocial?100:38} ${h*.39} h${(w-(freeSocial?138:76))*pRule}`} stroke={accent} stroke-width="2" opacity={pRule}/>
      <g opacity={pBody} transform={`translate(0 ${20*(1-pBody)})`}>
        {#each bodyLayout.lines as line,i}
          <text xml:space="preserve" data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={alignedX(rich.alignment,freeSocial?104:48,w-(freeSocial?152:96))} y={barBodyBaseline+i*bodyLayout.lineHeight} text-anchor={textAnchor(rich.alignment)} font-size={bodyFontSize} fill={textColor(element,'line1','secondary')} font-family={fontFamily} font-weight={rich.bodyBold?'800':'400'}>{#each line.runs as run}<tspan font-weight={run.bold?'800':rich.bodyBold?'800':'400'} font-style={run.italic?'italic':rich.bodyItalic?'italic':'normal'} text-decoration={run.underline||rich.bodyUnderline?'underline':'none'}>{run.text}</tspan>{/each}</text>
        {/each}
      </g>
    {:else if freeLabel}
      <g clip-path={`url(#${contentClipId})`} opacity={pBody}>
        <g opacity={labelWeights.first}>
        {#if activeScroll1}
          {#each Array.from({length:repeatCount},(_,i)=>i) as i}
            <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={startScroll-scrollDistance+i*(lineWidth1+scrollGap)} y={lineY(0)} fill={textColor(element,'line1','white')} font-size={typeSize} font-family={fontFamily} font-weight="800">{line1Text}</text>
          {/each}
        {:else}
          <g transform={`translate(${-26*(1-pBody)} 0)`}>
            <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x={clipStart+2} y={lineY(0)} fill={textColor(element,'line1','white')} font-size={fit(line1Text,typeSize,clipWidth-6)} font-family={fontFamily} font-weight="800">{line1Text}</text>
          </g>
        {/if}
        </g>
        <g opacity={labelWeights.second}>
        {#if fields.line2}
          {#if activeScroll2}
            {#each Array.from({length:repeatCount},(_,i)=>i) as i}
              <text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x={startScroll-scrollDistance+i*(lineWidth2+scrollGap)} y={lineY(1)} fill={textColor(element,'line2','secondary')} font-size={typeSize*.68} font-family={fontFamily}>{line2Text}</text>
            {/each}
          {:else}
            <text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x={clipStart+2} y={lineY(1)} fill={textColor(element,'line2','secondary')} font-size={fit(line2Text,typeSize*.68,clipWidth-6,false)} font-family={fontFamily}>{line2Text}</text>
          {/if}
        {/if}
        </g>
      </g>
    {:else}
      <g opacity={pIconOpacity} transform={`translate(48 48) scale(${pIconScale}) translate(-48 -48)`}>
        <rect x="18" y="18" width="60" height="60" rx="12" fill={paint.edge} fill-opacity=".32" stroke={accent} stroke-width="1.7" />
        <svg x="27" y="27" width="42" height="42" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path d={CARD_ICONS[element.kind] || CARD_ICONS.default} fill="none" stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </g>
      <g opacity={pTitle} transform={`translate(${-26*(1-pTitle)} 0)`}>
        <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x="100" y={h*.36} fill={textColor(element,'heading','secondary')} font-size={Math.min(17*fontScale,h*.21)} font-weight="800" letter-spacing="2.7">{fields.heading}</text>
      </g>
      <g opacity={pBody} transform={`translate(${-26*(1-pBody)} 0)`}>
        <text data-edit-field="line1" style={fieldTextStyle(element,'line1')} x="100" y={cardTextY.main} fill={textColor(element,'line1','white')} font-family={fontFamily} font-size={fit(fields.line1, Math.min(fSize,h*.32), w-134)} font-weight="800">{fields.line1}</text>
        {#if fields.line2}<text data-edit-field="line2" style={fieldTextStyle(element,'line2')} x="100" y={cardTextY.secondary} fill={textColor(element,'line2','secondary')} font-family={fontFamily} font-size={fit(fields.line2, Math.min(18*fontScale,h*.15), w-134,false)}>{fields.line2}</text>{/if}
      </g>
    {/if}
  {/if}
  {#if isCompactCartela(element)}
    <ShineOverlay id={`classic-${id}`} {time} {duration} width={w} height={h}
      shape={legacyShineShape} kind="card"
      enabled={element.shineEnabled!==false}/>
  {/if}
  {#if isTechSide}
    <DiagonalGlow id={`classic-${id}`} {time} {duration} width={w} height={h}
      shape={techShape} path={diagonalPath} secondaryPath={diagonalInner}
      enabled={element.diagonalGlowEnabled===true}
      intensity={element.diagonalGlowIntensity ?? 170}/>
  {/if}
</g>
