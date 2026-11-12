<script lang="ts">
  import { shineFrame, type ShineKind } from '../lib/shine';
  export let id:string; export let time=0; export let duration=5.3;
  export let width:number; export let height:number;
  export let path:string; export let secondaryPath=''; export let shape:string;
  export let kind:ShineKind='bar'; export let enabled=false;
  $: frame=shineFrame(time,duration,kind);
  $: clipId=`diag-area-${id}`; $: gradId=`diag-grad-${id}`;
  $: center=frame.progress*100;
  $: low=Math.max(0,center-18); $: high=Math.min(100,center+18);
</script>
<svelte:options namespace="svg" />
{#if enabled && frame.visible}
  <defs>
    <clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path d={shape}/></clipPath>
    <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset={`${low}%`} stop-color="#ffffff" stop-opacity="0"/>
      <stop offset={`${center}%`} stop-color="#ffffff" stop-opacity="1"/>
      <stop offset={`${high}%`} stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g clip-path={`url(#${clipId})`} pointer-events="none" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d={path} stroke={`url(#${gradId})`} stroke-width="10" opacity={frame.strength*2.1}/>
    <path d={path} stroke={`url(#${gradId})`} stroke-width="3" opacity={frame.strength*3}/>
    {#if secondaryPath}<path d={secondaryPath} stroke={`url(#${gradId})`} stroke-width="6" opacity={frame.strength*1.6}/>{/if}
  </g>
{/if}
