<script lang="ts">
  import type { HudElement } from '../lib/types';
  export let element: HudElement;
  export let x = 52;
  export let y = 500;
  export let fontSize = 17;
  export let maxWidth = 250;
  export let maxHeight = 34;
  export let color = '#E2BB61';
  export let letterSpacing = 5;
  $: mode = element.footerMode || 'text';
  $: caption = (element.footerText ?? 'RDV BUS').trim();
  $: hasLogo = mode === 'image' && !!element.footerImageData;
  $: effectiveFont = Math.max(9, Math.min(fontSize, maxWidth / Math.max(1, caption.length * .66 + (caption.length - 1) * letterSpacing / fontSize)));
</script>

{#if mode !== 'none'}
  <g transform={`translate(${x} ${y})`} pointer-events="none" aria-label="Identidade do rodapé">
    {#if hasLogo}
      <image href={element.footerImageData} x="0" y={-maxHeight + 5}
        width={maxWidth} height={maxHeight} preserveAspectRatio="xMinYMid meet"/>
    {:else if caption}
      <text x="0" y="0" font-family={element.style.fontFamily || 'Arial, sans-serif'}
        font-size={effectiveFont} font-weight="800" letter-spacing={letterSpacing}
        fill={color}>{caption}</text>
    {/if}
  </g>
{/if}
