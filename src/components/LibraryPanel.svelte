<script lang="ts">
 import Icon from './Icon.svelte';
 import { KIND_INFO } from '../lib/templates';
 import type { ElementKind, RDVProject } from '../lib/types';
 export let project:RDVProject;
 export let selectedId:string|null;
 export let onCategory:(kind:ElementKind)=>void;
 export let onSelect:(id:string)=>void;
 export let onAddLocation:()=>void;
 export let onDeleteLocation:()=>void;
 export let onCredit:(photo:boolean)=>void;
 export let disabled=false;
 const categories:ElementKind[]=['technical','route','date','location','credit','driver','freeText','slide','corner'];
 $: selected=project.elements.find(el=>el.id===selectedId);
 $: instances=project.elements.filter(el=>el.kind===selected?.kind);
</script>
<div class="library-head"><div class="panel-heading"><Icon name="grid" size={18}/><span>Categorias</span></div></div>
<div class="library-scroll">
 <h3 class="section-label">ESCOLHA UMA CATEGORIA</h3>
 <div class="templates">
 {#each categories as kind}
  <button class="template-card category-choice" class:category-active={selected?.kind===kind} aria-pressed={selected?.kind===kind} {disabled} on:click={()=>onCategory(kind)}>
    <span class="template-icon"><Icon name={KIND_INFO[kind].icon} size={19}/></span>
    <span class="template-text"><strong>{KIND_INFO[kind].label}</strong><small>{KIND_INFO[kind].description}</small></span>
    {#if !project.elements.some(el=>el.kind===kind)}<Icon name="plus" size={15}/>{/if}
  </button>
 {/each}
 </div>
 {#if selected?.kind==='location'||selected?.kind==='credit'||instances.length>1}
  <div class="library-divider"></div>
  <h3 class="section-label">{selected?.kind==='location'?'LOCAIS':selected?.kind==='credit'?'CRÉDITOS':'VARIAÇÕES'}</h3>
  <div class="layers-list">
    {#each instances as el,i (el.id)}
      <button class="button secondary-button category-instance" class:category-active={selectedId===el.id} aria-pressed={selectedId===el.id} {disabled} on:click={()=>onSelect(el.id)}>{el.kind==='location'?'Local '+(i+1):el.kind==='credit'?(el.productionRole==='photoCredit'?'Crédito fotográfico':'Crédito de filmagem')+(instances.filter(e=>e.productionRole===el.productionRole).length>1?' · '+(i+1):''):el.title}</button>
    {/each}
    {#if selected?.kind==='location'}
      <button class="button secondary-button" {disabled} on:click={onAddLocation}>+ Adicionar local</button>
      {#if instances.findIndex(el=>el.id===selectedId)>0}<button class="button secondary-button location-delete" {disabled} on:click={onDeleteLocation}>Excluir local</button>{/if}
    {:else if selected?.kind==='credit'}
      <button class="button secondary-button" {disabled} on:click={()=>onCredit(false)}>Crédito de filmagem</button>
      <button class="button secondary-button" {disabled} on:click={()=>onCredit(true)}>Crédito de fotos</button>
    {/if}
  </div>
 {/if}
</div>
