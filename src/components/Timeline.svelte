<script lang="ts">
  import Icon from './Icon.svelte';
  import type { RDVProject } from '../lib/types';
  export let project: RDVProject;
  export let selectedId: string | null;
  export let time: number;
  export let playing: boolean;
  export let onTogglePlay: () => void;
  export let onStop: () => void;
  export let onSeek: (time: number) => void;
  export let onSelect: (id: string) => void;
  const pad = (n: number) => n.toFixed(2).padStart(5, '0');
  $: duration = project.canvas.duration;
  $: markers = Array.from({ length: Math.min(11, Math.floor(duration) + 1) }, (_, i) => i === 0 ? 0 : Number((i * duration / Math.min(10, Math.floor(duration))).toFixed(1)));
</script>

<div class="timeline-top">
  <div class="panel-heading"><Icon name="clock" size={16}/><span>Linha do tempo</span></div>
  <span class="timeline-help">Animação HUD · {project.canvas.fps} FPS</span>
  <span class="version-chip">{Math.round(duration * project.canvas.fps)} quadros</span>
</div>
<div class="timeline-body">
  <div class="timeline-controls">
    <button class="icon-button" title="Voltar ao início" on:click={onStop}><Icon name="skip-back"/></button>
    <button class="play-button" aria-label={playing ? 'Pausar' : 'Reproduzir'} on:click={onTogglePlay}><Icon name={playing ? 'pause' : 'play'} size={19}/></button>
    <button class="icon-button" title="Ir ao fim" on:click={() => onSeek(duration)}><Icon name="skip-forward"/></button>
    <strong class="timecode">{pad(time)} <span>/ {pad(duration)}</span></strong>
  </div>
  <div class="timeline-tracks">
    <div class="ruler">
      {#each markers as marker}<span>{marker.toFixed(1)}s</span>{/each}
    </div>
    <div class="tracks-area">
      {#each project.elements as element (element.id)}
        <button class:track-selected={selectedId === element.id} class:track-hidden={!element.visible} class="track" title={`Selecionar ${element.title}`} on:click={() => onSelect(element.id)}>
          <span class="track-label">{element.title}</span><span class="track-bar" style={`--track-accent: ${element.style.accent}`}></span>
        </button>
      {/each}
      {#if project.elements.length === 0}<span class="empty-track">Sem camadas</span>{/if}
    </div>
    <input aria-label="Posição da linha do tempo" title="Arraste para navegar pelos quadros" class="seek-range" type="range" min="0" max={duration} step={1 / project.canvas.fps} value={time} on:input={(event) => onSeek(Number(event.currentTarget.value))}/>
  </div>
</div>
