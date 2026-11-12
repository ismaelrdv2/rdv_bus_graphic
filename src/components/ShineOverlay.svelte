<script lang="ts">
  import { shineFrame, type ShineKind } from '../lib/shine';
  export let id:string; export let time=0; export let duration=5.3;
  export let width:number; export let height:number; export let shape='';
  export let radius=0; export let kind:ShineKind='card'; export let enabled=true;
  $: frame=shineFrame(time,duration,kind);
  $: band=Math.min(kind==='full'?220:kind==='bar'?130:78,Math.max(30,width*(kind==='full'?.15:.20)));
  $: tilt=Math.min(kind==='full'?150:90,Math.max(20,height*.12));
  $: x=-band-tilt+frame.progress*(width+band+2*tilt);
  $: clipId=`shine-area-${id}`; $: gradId=`shine-grad-${id}`;
</script>
{#if enabled && frame.visible}
  <defs>
    <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
      {#if shape}<path d={shape}/>{:else}<rect x="0" y="0" width={width} height={height} rx={radius}/>{/if}
    </clipPath>
    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="42%" stop-color="#ffffff" stop-opacity=".5"/>
      <stop offset="54%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g clip-path={`url(#${clipId})`} pointer-events="none" opacity={frame.strength}>
    <path d={`M${x} 0 H${x+band} L${x+band+tilt} ${height} H${x+tilt} Z`} fill={`url(#${gradId})`}/>
  </g>
{/if}
