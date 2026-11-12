<script lang="ts">
  import { shineFrame, type ShineKind } from '../lib/shine';
  export let id:string; export let time=0; export let duration=5.3;
  export let width:number; export let height:number;
  export let path:string; export let secondaryPath=''; export let shape:string;
  export let kind:ShineKind='bar'; export let enabled=false;
  /** 100% = brilho anterior; 170% é o novo padrão. */
  export let intensity=170;
  $: gain=Math.min(3,Math.max(.5,intensity/100));
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
    <path d={path} stroke={`url(#${gradId})`} stroke-width="10" opacity={Math.min(1,frame.strength*2.1*gain)}/>
    <path d={path} stroke={`url(#${gradId})`} stroke-width="3" opacity={Math.min(1,frame.strength*3*gain)}/>
    {#if secondaryPath}<path d={secondaryPath} stroke={`url(#${gradId})`} stroke-width="6" opacity={Math.min(1,frame.strength*1.6*gain)}/>{/if}
  </g>
{/if}
