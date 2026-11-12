<script lang="ts">
  import Icon from './Icon.svelte';
  import { KIND_INFO, KINDS } from '../lib/templates';
  import type { ElementKind, RDVProject } from '../lib/types';

  export let project: RDVProject;
  export let selectedId: string | null;
  export let onAdd: (kind: ElementKind) => void;
  export let onSelect: (id: string) => void;
  export let onToggleVisible: (id: string) => void;
</script>

<div class="library-head"><div class="panel-heading"><Icon name="grid" size={18}/><span>Biblioteca</span></div><span class="small-pill">{KINDS.length} modelos</span></div>
<div class="library-scroll">
  <h3 class="section-label">ELEMENTOS GRÁFICOS</h3>
  <div class="templates">
    {#each KINDS as kind}
      <button class="template-card" on:click={() => onAdd(kind)} title={`Adicionar ${KIND_INFO[kind].label}`}>
        <span class="template-icon"><Icon name={KIND_INFO[kind].icon} size={19}/></span>
        <span class="template-text"><strong>{KIND_INFO[kind].label}</strong><small>{KIND_INFO[kind].description}</small></span>
        <Icon name="plus" size={15}/>
      </button>
    {/each}
  </div>
  <div class="library-divider"></div>
  <div class="layer-title"><h3 class="section-label">CAMADAS DO PROJETO</h3><span>{project.elements.length}</span></div>
  <div class="layers-list">
    {#each [...project.elements].reverse() as element (element.id)}
      <div class:active-layer={selectedId === element.id} class="layer-row">
        <button class="layer-select" title={`Selecionar ${element.title}`} on:click={() => onSelect(element.id)}><Icon name={KIND_INFO[element.kind].icon} size={15}/><span>{element.title}</span></button>
        <button class="layer-eye icon-button" title={element.visible ? 'Ocultar' : 'Mostrar'} aria-label={`${element.visible ? 'Ocultar' : 'Mostrar'} ${element.title}`} on:click={() => onToggleVisible(element.id)}><Icon name={element.visible ? 'eye' : 'eye-off'} size={16}/></button>
      </div>
    {/each}
  </div>
  {#if project.elements.length === 0}<p class="info-copy">Adicione um elemento para começar a compor sua cena.</p>{/if}
</div>
