<script lang="ts">
  import type { SocialIconId } from '../lib/types';
  export let icon: SocialIconId = 'none';
  export let x = 18;
  export let y = 20;
  export let size = 46;
  export let color = '#E2BB61';
  export let framed = false;
</script>

{#if icon !== 'none'}
  <g transform={`translate(${x} ${y})`} pointer-events="none" aria-label={icon}>
    {#if framed}
      <rect x="0" y="0" width={size} height={size} rx={size*.2}
        fill={color} fill-opacity=".12" stroke={color} stroke-opacity=".8" stroke-width="1.5"/>
    {/if}
    <svg x={size*.14} y={size*.14} width={size*.72} height={size*.72} viewBox="0 0 24 24" overflow="visible">
      {#if icon === 'facebook'}
        <path d="M15.5 21V12.7H18l.4-3.5h-2.9V7.1c0-1 .4-1.6 1.8-1.6h1.3V2.4A17 17 0 0 0 16.6 2c-3.2 0-5 1.9-5 5.3v1.9H9v3.5h2.6V21z" fill={color}/>
      {:else if icon === 'instagram'}
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke={color} stroke-width="2.5"/>
        <circle cx="12" cy="12" r="4" fill="none" stroke={color} stroke-width="2.5"/>
        <circle cx="17.4" cy="6.7" r="1.3" fill={color}/>
      {:else if icon === 'x'}
        <path d="M3 3 L21 21 M21 3 L3 21" fill="none" stroke={color} stroke-width="3" stroke-linecap="round"/>
        <path d="M3 3 H7 L21 21 H17 Z" fill={color} fill-opacity=".45"/>
      {:else if icon === 'tiktok'}
        <path d="M14 2v13.4a4.6 4.6 0 1 1-4-4.6v3.7a1.3 1.3 0 1 0 1 1.3V2h3c.3 2.6 2.1 4.3 5 4.5v3.3c-2.1-.1-3.8-.8-5-2z" fill={color}/>
      {:else if icon === 'twitch'}
        <path d="M4 3h17v12l-5 5h-4l-3 3v-3H4z" fill="none" stroke={color} stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 8v6 M16 8v6" stroke={color} stroke-width="2.6"/>
      {:else if icon === 'whatsapp'}
        <path d="M6 19 3 21l1.2-4A9 9 0 1 1 7 19.4" fill="none" stroke={color} stroke-width="2" stroke-linejoin="round"/>
        <path d="M8 8c-.4 4 3.3 7.7 7.3 8l1.7-2.2-3-1.4-1.2 1.1c-1.7-.8-2.7-1.8-3.5-3.4l1.2-1.2L9 6.4z" fill={color}/>
      {:else if icon === 'telegram'}
        <path d="M2 11.5 22 3 18.5 21l-6.1-5-3.7 3 .8-6.2L19 6 7.5 13.5z" fill={color}/>
      {:else if icon === 'discord'}
        <path d="M6 5.5 9 4l.5 1.2a18 18 0 0 1 5 0L15 4l3 1.5c2.3 3.3 3.2 6.9 3.3 10.8-1.5 1.3-3.1 2.1-4.8 2.7l-1.1-1.9 1.6-.8a13 13 0 0 1-11.4 0l1.6.8-1.1 1.9c-1.7-.6-3.3-1.4-4.8-2.7.1-3.9 1-7.5 3.3-10.8z" fill={color}/>
        <circle cx="9" cy="12.2" r="1.3" fill="#241334"/>
        <circle cx="15" cy="12.2" r="1.3" fill="#241334"/>
      {/if}
    </svg>
  </g>
{/if}
