<script lang="ts">
  import type { HudElement } from '../lib/types';
  import { elementBaseHeight } from '../lib/geometry';
  import { palettePaint, textColor } from '../lib/palette';
  import { visualMotionFrame } from '../lib/visualAnimation';
  import { singleLineText } from '../lib/compactText';
  import SocialIcon from './SocialIcon.svelte';
  import FooterBrand from './FooterBrand.svelte';
  export let element: HudElement;
  export let canvasHeight = 1080;
  export let time = 0;
  export let duration = 5.3;
  $: style = element.freeTextStyle;
  $: label = style === 'newsLabel';
  $: ticker = style === 'newsTicker';
  $: lower = style === 'newsLowerThird';
  $: slide = style === 'newsSlide';
  $: modern = element.visualPreset === 'studio';
  $: w = element.style.width * element.style.scaleX;
  $: h = elementBaseHeight(element,canvasHeight) * element.style.scaleY;
  $: paint = palettePaint(element.style);
  $: accent = paint.primary;
  $: primary = textColor(element,'line1','white');
  $: secondary = textColor(element,'line2','secondary');
  $: headline = singleLineText(element.fields.heading || 'EM DESTAQUE');
  $: line1 = singleLineText(element.fields.line1 || '');
  $: line2 = singleLineText(element.fields.line2 || '');
  $: id = element.id.replace(/[^a-zA-Z0-9_-]/g,'');
  $: maskId = `broadcast-clip-${id}`;
  $: gradientId = `broadcast-gradient-${id}`;
  $: badgeWidth = label ? Math.min(125,w*.27) : ticker ? Math.min(225,w*.25) : 0;
  $: hasSocial = (element.freeTextIcon || 'none') !== 'none' && !slide;
  $: iconSize = label ? Math.min(64,h*.64) : ticker ? Math.min(78,h*.55) : Math.min(94,h*.48);
  $: iconX = Math.max(4,w-iconSize-(lower?32:label?15:22));
  $: iconY = label ? (h-iconSize)/2 : ticker ? (h*.73-iconSize)/2 : h*.36-iconSize/2;
  $: reserveRight = hasSocial ? iconSize + (lower?68:label?33:45) : 0;
  // A faixa lateral de 125 px precisa de duas linhas em títulos compridos.
  function splitBadgeTitle(title:string):string[]{
    if(title.length<=10)return [title];
    const words=title.split(/\s+/u).filter(Boolean);
    if(words.length<2)return [title];
    let first=words[0], rest=words.slice(1).join(' ');
    if(words.length>2){
      const idx=words.reduce((best,word,i)=>i>0&&i<words.length
        &&Math.abs(words.slice(0,i).join(' ').length-words.slice(i).join(' ').length)
         <Math.abs(words.slice(0,best).join(' ').length-words.slice(best).join(' ').length)?i:best,1);
      first=words.slice(0,idx).join(' ');rest=words.slice(idx).join(' ');
    }
    return [first,rest];
  }
  $: badgeLines = splitBadgeTitle(headline);
  $: motion = visualMotionFrame(element.animation,time,duration,slide?'fullscreen':'label',1);
  $: reveal = motion.active ? motion.panel : 1;
  $: textReveal = motion.active ? motion.value : 1;
  $: titleReveal = motion.active ? motion.title : 1;
  $: iconReveal = motion.active ? motion.iconOpacity : 1;
  $: fitted = (text:string,ideal:number,available:number) =>
    Math.max(9, Math.min(ideal,available/Math.max(1,[...text].length*.57)));
  function wrap(text:string,limit:number):string[]{
    const result:string[] = [];let line='';
    for(const word of text.split(/\s+/u)){
      if(!word)continue;
      if(line && line.length+word.length+1>limit){result.push(line);line=word;}else line+=(line?' ':'')+word;
    }
    if(line)result.push(line);
    return result.slice(0,5);
  }
  $: paragraphs = wrap(element.fields.line1||'',Math.max(19,Math.round(w/33)));
</script>

<defs>
  <clipPath id={maskId}><rect width={w} height={h} rx={modern?Math.min(20,h*.17):3}/></clipPath>
  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
    <stop stop-color={paint.background}/><stop offset="1" stop-color={paint.dark}/>
  </linearGradient>
</defs>
<g clip-path={`url(#${maskId})`} opacity={Math.min(1,reveal*3)}>
  {#if label}
    <!-- Etiqueta Plantão: bandeira lateral de noticiário e duas linhas de informação. -->
    <rect width={w} height={h} rx={modern?18:3} fill={`url(#${gradientId})`} stroke={paint.edge} stroke-width={modern?2:3}/>
    <rect width={badgeWidth} height={h} rx={modern?12:0} fill={accent}/>
    <path d={`M${badgeWidth+12} 3 H${w-22}`} stroke={accent} stroke-width={modern?3:5} opacity={motion.active?motion.gold:1}/>
    {#each badgeLines as part,i}
      <text data-edit-field="heading" x={badgeWidth/2} y={badgeLines.length>1?h*(.43+i*.27):h*.59}
        text-anchor="middle" fill={paint.dark} font-size={fitted(part,Math.min(24,h*.25),badgeWidth-16)}
        font-weight="900">{part}</text>
    {/each}
    <g opacity={textReveal}>
      <text data-edit-field="line1" x={badgeWidth+16} y={h*.50} fill={primary} font-size={fitted(line1,h*.31,w-badgeWidth-34-reserveRight)} font-weight="800">{line1}</text>
      <text data-edit-field="line2" x={badgeWidth+17} y={h*.81} fill={secondary} font-size={fitted(line2,h*.19,w-badgeWidth-36-reserveRight)}>{line2}</text>
    </g>
  {:else if ticker}
    <!-- Barra de notícias: bandeira esquerda, manchete e subtítulo em filete inferior. -->
    <rect width={w} height={h} rx={modern?19:1} fill={`url(#${gradientId})`} stroke={paint.edge} stroke-width={modern?2:3}/>
    <rect width={badgeWidth} height={h*.73} fill={accent}/>
    <text data-edit-field="heading" x={badgeWidth/2} y={h*.45} text-anchor="middle" fill={paint.dark} font-weight="900" font-size={fitted(headline,Math.min(30,h*.27),badgeWidth-18)}>{headline}</text>
    <rect y={h*.75} width={w} height={h*.25} fill={modern?paint.edge:accent} fill-opacity={modern?.55:1}/>
    <g opacity={textReveal}>
      <text data-edit-field="line1" x={badgeWidth+25} y={h*.54} fill={primary} font-size={fitted(line1,h*.34,w-badgeWidth-48-reserveRight)} font-weight="850">{line1}</text>
      <text data-edit-field="line2" x="24" y={h*.93} fill={modern?secondary:paint.dark} font-size={fitted(line2,Math.min(24,h*.17),w-48)} font-weight="700">{line2}</text>
    </g>
  {:else if lower}
    <!-- Lower third editorial: duas camadas, sem barra opaca cobrindo toda a imagem. -->
    <path d={`M0 0 H${w-44} L${w} 44 V${h*.75} H0 Z`} fill={`url(#${gradientId})`} stroke={paint.edge} stroke-width="2.5"/>
    <rect x="0" y="0" width={modern?9:19} height={h*.76} fill={accent}/>
    <rect x={modern?25:32} y={h*.77} width={w-(modern?25:32)} height={h*.23} rx={modern?9:0} fill={accent}/>
    <text data-edit-field="heading" x={modern?42:48} y={h*.22} font-size={fitted(headline,h*.16,w-100-reserveRight)} letter-spacing="3" fill={accent} font-weight="900" opacity={titleReveal}>{headline}</text>
    <text data-edit-field="line1" x={modern?42:48} y={h*.61} font-size={fitted(line1,h*.34,w-112-reserveRight)} fill={primary} font-weight="900" opacity={textReveal}>{line1}</text>
    <text data-edit-field="line2" x={modern?48:54} y={h*.935} font-size={fitted(line2,h*.15,w-98)} fill={paint.dark} font-weight="800" opacity={textReveal}>{line2}</text>
  {:else if slide}
    <!-- Manchete em tela cheia: título e corpo em área editorial com respiro e rodapé independente. -->
    <rect width={w} height={h} fill={`url(#${gradientId})`} fill-opacity=".97"/>
    <path d={`M0 0 H${modern?Math.min(22,w*.024):Math.min(40,w*.045)} V${h} H0Z`} fill={accent}/>
    <rect x={w*.08} y={h*.12} width={w*.34} height={Math.max(6,h*.012)} fill={accent} opacity={motion.active?motion.gold:1}/>
    <text data-edit-field="heading" x={w*.08} y={h*.22} fill={accent} letter-spacing="5"
      font-size={fitted(headline,Math.min(h*.045,54),w*.82)} font-weight="900" opacity={titleReveal}>{headline}</text>
    {#each paragraphs as paragraph,index}
      <text data-edit-field="line1" x={w*.08} y={h*.34+index*Math.min(96,h*.095)}
        fill={primary} font-size={fitted(paragraph,Math.min(78,h*.078),w*.80)}
        font-weight={modern?"700":"900"} opacity={textReveal}>{paragraph}</text>
    {/each}
    <rect x={w*.08} y={h*.81} width={w*.84} height={Math.max(2,h*.004)} fill={paint.edge} opacity=".8"/>
    <text data-edit-field="line2" x={w*.08} y={h*.88} fill={secondary}
      font-size={fitted(line2,Math.min(37,h*.037),w*.82)} opacity={textReveal}>{line2}</text>
    <FooterBrand {element} x={w*.08} y={h*.967} fontSize={Math.min(21,h*.022)} maxWidth={w*.42} maxHeight={h*.06}
      color={textColor(element,'footer','secondary')}/>
  {/if}
  {#if hasSocial}
    <!-- Ícone disponível em todos os modelos que oferecem seletor no inspetor. -->
    <g opacity={iconReveal} transform={`translate(${iconX+iconSize/2} ${iconY+iconSize/2}) scale(${motion.active?motion.iconScale:1}) translate(${-iconSize/2} ${-iconSize/2})`}>
      <SocialIcon icon={element.freeTextIcon || 'none'} x={0} y={0} size={iconSize} color={accent} framed={true}/>
    </g>
  {/if}
</g>
