<script lang="ts">
  import { BRAND, TECHNICAL_CAPTIONS } from '../lib/brand';
  import { palettePaint, textColor } from '../lib/palette';
  import type { TextColorKey } from '../lib/types';
  import type { HudElement } from '../lib/types';
  import { fieldTextStyle } from '../lib/inlineText';
  import { fontStack } from '../lib/fonts';
  import { clamp } from '../lib/timing';
  import { legacyPhase, legacyStage } from '../lib/legacy';
  import ShineOverlay from './ShineOverlay.svelte';
  import DiagonalGlow from './DiagonalGlow.svelte';
  export let element: HudElement;
  export let time = 0;
  export let duration = 5.3;

  $: w = element.style.width * element.style.scaleX;
  $: h = 650 * element.style.scaleY;
  $: fields = element.fields;
  $: paint = palettePaint(element.style);
  $: captions = element.kind === 'technical' ? (element.technicalCaptions || TECHNICAL_CAPTIONS) : (element.freeTextCaptions || TECHNICAL_CAPTIONS);
  $: fontFamily = fontStack(element.style.fontFamily);
  $: fontScale = clamp(element.style.scaleY, .75, 1.4);
  $: p = element.animation === 'legacy' ? legacyPhase(time,duration,1.3,.5) : 1;
  $: panel = element.animation === 'legacy' ? legacyStage(p,0,.38) : 1;
  $: title = element.animation === 'legacy' ? legacyStage(p,.22,.26) : 1;
  $: footer = element.animation === 'legacy' ? legacyStage(p,.65,.22) : 1;
  $: id = element.id.replace(/[^a-zA-Z0-9_-]/g,'');
  let measureContext: CanvasRenderingContext2D | null = null;
  function fit(text:string, preferred:number, maximum:number):number {
    if (!text) return preferred;
    if (typeof document === 'undefined') return Math.min(preferred, maximum / Math.max(text.length*.6,1));
    if (!measureContext) measureContext = document.createElement('canvas').getContext('2d');
    if (!measureContext) return preferred;
    measureContext.font = `800 ${preferred}px ${fontFamily}`;
    const measured = measureContext.measureText(text).width;
    return measured > maximum ? Math.max(12,preferred*maximum/measured*.98) : preferred;
  }
  // Dependência reativa explícita de p: a lista é recalculada a cada quadro.
  // Não usar rowProgress(i) diretamente em {@const}: o compilador Svelte não
  // rastreia p quando ele é acessado somente dentro de uma função auxiliar.
  $: rowReveals = Array.from({ length: 6 }, (_, i) =>
    element.animation === 'legacy' ? legacyStage(p, .32 + .085 * i, .28) : 1
  );
</script>

<g font-family={fontFamily}>
  <defs>
    <linearGradient id={`portrait-bar-${id}`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color={paint.background}/>
      <stop offset="0.64" stop-color={element.style.background}/>
      <stop offset="1" stop-color={paint.dark}/>
    </linearGradient>
    <clipPath id={`portrait-clip-${id}`}><path d={`M0 68 L68 0 H${w} V${h} H0Z`}/></clipPath>
  </defs>
  <g opacity={panel} transform={`translate(0 ${45*(1-panel)})`}>
    <path d={`M0 68 L68 0 H${w} V${h} H0Z`} fill={`url(#portrait-bar-${id})`} fill-opacity=".93"/>
    <path d={`M0 68 L68 0 H${w}`} stroke={element.style.accent} stroke-width="5" fill="none"/>
    <path d={`M16 78 L85 12 H${w-28}`} stroke={paint.edge} stroke-width="2" fill="none"/>
  </g>
  <g clip-path={`url(#portrait-clip-${id})`}>
    <g opacity={title} transform={`translate(0 ${22*(1-title)})`}>
      <text data-edit-field="heading" style={fieldTextStyle(element,'heading')} x="78" y={Math.max(81,h*.145)}
        fill={textColor(element,'heading','primary')} font-size={fit(fields.heading || 'FICHA TÉCNICA',35*fontScale,w-150)} font-weight="800" letter-spacing="3">{fields.heading || 'FICHA TÉCNICA'}</text>
      <path d={`M78 ${h*.172} H${w-65}`} stroke={paint.edge} stroke-width="2"/>
    </g>
    {#each [fields.line1,fields.line2,fields.line3,fields.line4,fields.line5,fields.line6] as value,i}
      {@const col = i%2}
      {@const row = Math.floor(i/2)}
      {@const left = 80 + col*(w-135)/2}
      {@const area = (w-135)/2 - 35}
      {@const pitch = (h*.69)/3}
      {@const top = h*.205 + row*pitch}
      {@const revealed = rowReveals[i]}
      {#if value}
      <g opacity={revealed} transform={`translate(0 ${18*(1-revealed)})`}>
        <path d={`M${left-23} ${top+7} l8 9 -8 9 M${left-12} ${top+7} l8 9 -8 9`} stroke={element.style.accent} fill="none" stroke-width="2.9" stroke-linejoin="round"/>
        <text data-edit-caption={i} style={fieldTextStyle(element,'caption'+i)} x={left+10} y={top+13} fill={textColor(element,('caption'+i) as TextColorKey,'secondary')}
          font-size={Math.min(16*fontScale,pitch*.16)} letter-spacing="2.1" font-weight="800">{captions[i] || ''}</text>
        <text data-edit-field={'line'+(i+1)} style={fieldTextStyle(element,'line'+(i+1))} x={left+10} y={top+55*fontScale} fill={textColor(element,('line'+(i+1)) as TextColorKey,'white')}
          font-size={fit(value,Math.min(36*fontScale,pitch*.40),area)} font-weight="800">{value}</text>
        <path d={`M${left+10} ${top+75*fontScale} H${left+area}`} stroke={paint.edge} stroke-opacity=".8" stroke-width="1.6"/>
      </g>
      {/if}
    {/each}
    <g opacity={footer}>
      <text x="79" y={h-24} fill={textColor(element,'footer','secondary')} font-size={15*fontScale} letter-spacing="5.5" font-weight="800">R D V  B U S</text>
      <path d={`M${w-134} ${h-20} h72 l19 -17`} stroke={element.style.accent} stroke-width="2.5" fill="none"/>
    </g>
  </g>
  <ShineOverlay id={`bottom-${id}`} {time} {duration} width={w} height={h}
    shape={`M0 68 L68 0 H${w} V${h} H0Z`} kind="bar" enabled={element.shineEnabled!==false}/>
  <DiagonalGlow id={`bottom-${id}`} {time} {duration} width={w} height={h}
    shape={`M0 68 L68 0 H${w} V${h} H0Z`} path="M0 68 L68 0"
    secondaryPath="M16 78 L85 12" enabled={element.diagonalGlowEnabled===true}/>
</g>
