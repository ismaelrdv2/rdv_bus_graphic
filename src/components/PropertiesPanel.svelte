<script lang="ts">
  import Icon from './Icon.svelte';
  import PalettePanel from './PalettePanel.svelte';
  import { DEFAULT_PALETTE, colorAsSelected, textGroupAsSelected } from '../lib/palette';
  import { FIELD_LABELS, KIND_INFO } from '../lib/templates';
  import { DEFAULT_RICH_TEXT } from '../lib/richtext';
  import { singleLineText } from '../lib/compactText';
  import { isBottomBar, isBar, isCompactCartela, CREDIT_CARD_WIDTH, CREDIT_CARD_HEIGHT } from '../lib/geometry';
  import type { FreeTextStyle, RichTextSettings, TechnicalLayout, VisualPreset, HudElement, HudStyle, RDVProject, TextField, TextColorKey, TextColorRole, TextColorGroup, PaletteColors, PaletteId } from '../lib/types';

  export let project: RDVProject;
  export let systemFonts: string[] = [];
  export let onFontFamily: (font: string) => void = () => {};
  export let selected: HudElement | null;
  export let onField: (key: TextField, value: string) => void;
  export let onStyle: (key: keyof HudStyle, value: number | string) => void;
  export let onTextColor: (key: TextColorKey, role: TextColorRole) => void;
  export let onTextGroup: (group: TextColorGroup, role: TextColorRole) => void;
  export let onProjectTextGroup: (group: TextColorGroup, role: TextColorRole) => void;
  export let onAllSelectedText: (role: TextColorRole) => void;
  export let onAllProjectText: (role: TextColorRole) => void;
  export let onPalettePreset: (preset: PaletteId) => void;
  export let onPaletteColor: (key: keyof PaletteColors, color: string) => void;

  export let onAnimation: (value: HudElement['animation']) => void;
  export let onShineToggle:(value:boolean)=>void;
  export let onDiagonalGlowToggle:(value:boolean)=>void;
  export let onDiagonalGlowIntensity:(value:number)=>void;
  export let onRename: (title: string) => void;
  export let onDuplicate: () => void;
  export let onDelete: () => void;
  export let onImage: (data: string | undefined) => void;
  export let onFooter: (key:'footerMode'|'footerText'|'footerImageData', value:string | undefined) => void;
  export let onCanvas: (key: 'fps' | 'duration' | 'orientation', value: number | string) => void;
  export let onTechnicalSide: (side: 'left' | 'right') => void;
  export let onFreeTextStyle: (style: FreeTextStyle) => void;
  export let onFreeTextIcon: (icon: HudElement['freeTextIcon']) => void;
  export let onFreeTextDisplay: (mode: HudElement['freeTextDisplay']) => void;
  export let onTechnicalLayout: (layout: TechnicalLayout) => void;
  export let onVisualPreset: (preset: VisualPreset) => void;
  export let onFitScrollDuration: () => void;
  export let onRichText: (key: keyof RichTextSettings, value: string | number | boolean) => void;
  export let onFreeTextCaption: (index: number, value: string) => void;
  export let onResetScale: () => void;
  export let onStandardizeSelected: () => void;
  export let onStandardizeAll: () => void;
  export let onSelectNone: () => void;

  const colorGroups: { key: TextColorGroup, label: string, note: string }[] = [
    { key: 'title', label: 'Cor do título', note: 'Cabeçalho e títulos das cartelas' },
    { key: 'body', label: 'Cor do corpo', note: 'Valores e texto principal' },
    { key: 'secondary', label: 'Cor do texto secundário', note: 'Subtítulos, rótulos e rodapés' },
  ];
  type InspectorTab = 'content' | 'typography' | 'colors' | 'dimensions' | 'motion' | 'palette' | 'project';
  let activeTab: InspectorTab = 'content';
  let previousSelection = '';
  $: if ((selected?.id || '') !== previousSelection) {
    previousSelection = selected?.id || '';
    activeTab = selected ? 'content' : 'project';
  }
  const selectedTabs: {id: InspectorTab; title: string}[] = [
    {id:'content',title:'Conteúdo'}, {id:'typography',title:'Tipografia'},
    {id:'colors',title:'Cores'}, {id:'dimensions',title:'Dimensões'},
    {id:'motion',title:'Animação'}, {id:'palette',title:'Paleta'},
  ];
  let imageInput: HTMLInputElement;
  let footerImageInput: HTMLInputElement;
  let footerError = '';
  let allSelectedRole: TextColorRole = 'white';
  let bodyEditor: HTMLTextAreaElement;
  $: richText = selected?.richText || DEFAULT_RICH_TEXT;
  $: bottomBar = selected ? isBottomBar(selected,project.canvas.width,project.canvas.height) : false;
  $: richEditor = selected?.kind === 'freeText' && (['classic','fullPage','legacyPresentationBar','legacyPresentationSlide','newsSlide'].includes(selected.freeTextStyle || 'classic'));
  $: isFullscreen = (selected?.kind === 'technical' && ['fullscreen','legacyFullscreen'].includes(selected.technicalLayout || '')) || (selected?.kind === 'freeText' && (selected.freeTextStyle === 'fullTechnical' || selected.freeTextStyle === 'fullPage' || selected.freeTextStyle === 'legacyPresentationSlide' || selected.freeTextStyle === 'newsSlide'));
  function markSelection(marker: string): void {
    if (!selected || !bodyEditor) return;
    const from = bodyEditor.selectionStart;
    const to = bodyEditor.selectionEnd;
    const previous = selected.fields.line1;
    const value = previous.slice(0, from) + marker + previous.slice(from, to) + marker + previous.slice(to);
    onField('line1', value);
    requestAnimationFrame(() => { bodyEditor?.focus(); bodyEditor?.setSelectionRange(from + marker.length, to + marker.length); });
  }
  let imageError = '';
  $: labels = selected ? FIELD_LABELS[selected.kind] : {};
  $: fieldKeys = selected?.kind === 'freeText' && selected.freeTextStyle === 'technicalBar'
    ? ['heading', 'line1', 'line2', 'line3', 'line4', 'line5', 'line6'] as TextField[]
    : selected?.kind === 'freeText' && selected.freeTextStyle === 'fullTechnical'
    ? ['heading', 'line1', 'line2', 'line3', 'line4', 'line5', 'line6'] as TextField[]
    : selected?.kind === 'freeText' && selected.freeTextStyle === 'technicalAlpha1'
    ? ['heading', 'line1', 'line2', 'line3', 'line4'] as TextField[]
    : selected?.kind === 'freeText' && ['legacyLabel','legacyHalfBar','legacyFullBar'].includes(selected.freeTextStyle || '')
    ? ['line1', 'line2'] as TextField[]
    : selected?.kind === 'freeText' && ['newsLabel','newsTicker','newsLowerThird','newsSlide'].includes(selected.freeTextStyle || '')
    ? ['heading','line1','line2'] as TextField[]
    : Object.keys(labels) as TextField[];

  async function imageChanged(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    imageError = '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      imageError = 'Use PNG, JPG ou WebP.';
      input.value = '';
      return;
    }
    if (file.size > 3_600_000) {
      imageError = 'Imagem muito grande (máximo de 3,6 MB).';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') onImage(reader.result); };
    reader.onerror = () => { imageError = 'Não foi possível abrir a imagem.'; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  async function footerImageChanged(event:Event):Promise<void>{
    const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];
    if(!file)return;
    footerError='';
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>3_500_000){
      footerError='Escolha PNG, JPG ou WebP com até 3,5 MB.';
      input.value='';return;
    }
    const reader=new FileReader();
    reader.onload=()=>{if(typeof reader.result==='string')onFooter('footerImageData',reader.result);};
    reader.onerror=()=>{footerError='Falha ao abrir a logomarca.';};
    reader.readAsDataURL(file);input.value='';
  }
</script>

<div class="inspector-head">
  <div class="panel-heading"><Icon name="settings" size={18}/><span>Propriedades</span></div>
  {#if selected}
    <button class="icon-button" title="Voltar para o projeto" aria-label="Propriedades do projeto" on:click={onSelectNone}><Icon name="layers"/></button>
  {/if}
</div>

<div class="inspector-scroll">
  {#if selected}
    <div class="selected-heading">
      <div class="selected-icon"><Icon name={KIND_INFO[selected.kind].icon} size={23}/></div>
      <div><strong>{KIND_INFO[selected.kind].label}</strong><small>Elemento selecionado</small></div>
    </div>

    <div class="inspector-tabs" role="tablist" aria-label="Categorias de personalização">
      {#each selectedTabs as tab}
        <button type="button" role="tab" class:inspector-tab-active={activeTab === tab.id} aria-selected={activeTab === tab.id} on:click={() => activeTab = tab.id}>{tab.title}</button>
      {/each}
    </div>
    {#if activeTab === 'content'}
    <section class="property-section"><h3>Conteúdo do elemento</h3>
      {#if selected.kind === 'freeText'}
        <label class="field"><span>Estilo do texto livre</span>
          <select value={selected.freeTextStyle || 'classic'} on:change={(event) => onFreeTextStyle(event.currentTarget.value as FreeTextStyle)}>
            <option value="classic">Cartela RDV Bus (atual)</option>
            <option value="technicalBar">Faixa lateral — ficha clássica</option>
            <option value="technicalAlpha1">Ficha compacta — alpha.1</option>
            <option value="fullTechnical">Ficha em tela inteira — 6 campos</option>
            <option value="fullPage">Cartela em tela inteira — Studio</option>
            <option value="legacyLabel">Original 0.14 · Etiqueta</option>
            <option value="legacyHalfBar">Original 0.14 · Barra metade</option>
            <option value="legacyFullBar">Original 0.14 · Barra larga</option>
            <option value="legacyPresentationBar">Original 0.14 · Apresentação em barra</option>
            <option value="legacyPresentationSlide">Original 0.14 · Apresentação em slide (tela inteira)</option>
            <option value="newsLabel">Telejornal · Etiqueta Plantão</option>
            <option value="newsTicker">Telejornal · Barra de Notícias</option>
            <option value="newsLowerThird">Telejornal · Lower Third</option>
            <option value="newsSlide">Telejornal · Slide Manchete (tela inteira)</option>
          </select>
        </label>
      {/if}
      {#if selected.kind === 'freeText' && ['legacyLabel','legacyHalfBar','legacyFullBar','legacyPresentationBar','classic','newsLabel','newsTicker','newsLowerThird'].includes(selected.freeTextStyle || 'classic')}
        <label class="field"><span>Ícone social opcional</span>
          <select value={selected.freeTextIcon || 'none'} on:change={(event) => onFreeTextIcon(event.currentTarget.value as HudElement['freeTextIcon'])}>
            {#each ['none','facebook','instagram','x','tiktok','twitch','whatsapp','telegram','discord'] as social}
              <option value={social}>{social === 'none' ? 'Nenhum' : social === 'x' ? 'X (Twitter)' : social.charAt(0).toUpperCase()+social.slice(1)}</option>
            {/each}
          </select>
        </label>
      {/if}
      {#if selected.kind === 'freeText' && selected.freeTextStyle === 'legacyLabel'}
        <label class="field"><span>Apresentação dos textos da etiqueta</span>
          <select value={selected.freeTextDisplay || 'both'} on:change={(event)=>onFreeTextDisplay(event.currentTarget.value as HudElement['freeTextDisplay'])}>
            <option value="both">Texto 1 e Texto 2 — duas linhas</option>
            <option value="first">Somente Texto 1 — centralizado</option>
            <option value="second">Somente Texto 2 — centralizado</option>
            <option value="alternate">Alternar Texto 1 / Texto 2 durante o vídeo</option>
          </select>
        </label>
        <p class="inspector-hint">Etiqueta compacta: cada campo ocupa uma linha, sem quebra. Para parágrafos, use a cartela ou o slide.</p>
      {/if}
      {#if selected.kind === 'technical'}
        <label class="field"><span>Apresentação da ficha</span>
          <select value={selected.technicalLayout || 'side'} on:change={(event) => onTechnicalLayout(event.currentTarget.value as TechnicalLayout)}>
            <option value="side">Faixa lateral — clássica</option>
            <option value="fullscreen">Ficha técnica — tela inteira (Studio)</option>
            <option value="legacyFullscreen">Original 0.14 · Tela inteira com cartões</option>
          </select>
        </label>
      {/if}
      <label class="field"><span>Padrão visual dos elementos</span>
        <select value={selected.visualPreset || 'studio'} on:change={(event)=>onVisualPreset(event.currentTarget.value as VisualPreset)}>
          <option value="legacy">Clássico 0.14 · roxo e dourado</option>
          <option value="studio">Studio · reconstrução atual</option>
        </select>
      </label>
      <p class="inspector-hint">Clássico e Studio controlam apenas a aparência; qualquer transição pode ser combinada com os dois estilos. Os novos modelos são desenhos originais inspirados em telejornais.</p>
      <label class="field"><span>Nome no projeto</span><input type="text" value={selected.title} maxlength="80" on:input={(event) => onRename(event.currentTarget.value)}/></label>
      <h4>Editar os campos</h4>
      {#each fieldKeys as field}
        {@const label = selected.kind === 'freeText' && (selected.freeTextStyle || 'classic') !== 'classic'
          ? field === 'heading' ? 'Título' : richEditor && field === 'line1' ? 'Corpo do texto' : `Texto ${field.replace('line','')}`
          : richEditor && field === 'line1' ? 'Corpo do texto' : labels[field] || field}
        <label class="field">
          <span>{label}</span>
          {#if selected.kind === 'freeText' && selected.freeTextStyle === 'legacyLabel' && (field === 'line1' || field === 'line2')}
            <input type="text" maxlength="500" value={singleLineText(selected.fields[field as TextField])} on:input={(event) => onField(field as TextField, singleLineText(event.currentTarget.value))}/>
          {:else if field === 'line1' && richEditor}
            <textarea rows="7" maxlength="6000" bind:this={bodyEditor} value={selected.fields.line1} on:input={(event) => onField('line1', event.currentTarget.value)}></textarea>
          {:else if field === 'line1' && (selected.kind === 'freeText' || selected.kind === 'slide')}
            <textarea rows="2" maxlength="500" value={selected.fields[field as TextField]} on:input={(event) => onField(field as TextField, event.currentTarget.value)}></textarea>
          {:else}
            <input type="text" maxlength="500" value={selected.fields[field as TextField]} on:input={(event) => onField(field as TextField, event.currentTarget.value)}/>
          {/if}
        </label>
      {/each}
      {#if selected.kind === 'technical' || (selected.kind === 'freeText' && ['technicalBar','technicalAlpha1','fullTechnical'].includes(selected.freeTextStyle || 'classic'))}
        <div class="caption-fields">
          <h4>Rótulos acima dos valores</h4>
          {#each Array.from({ length: selected.kind === 'technical' || selected.freeTextStyle === 'technicalBar' || selected.freeTextStyle === 'fullTechnical' ? 6 : 4 }, (_, i) => i) as index}
            <label class="field"><span>Rótulo {index+1}</span><input type="text" maxlength="80" value={(selected.kind === 'technical' ? selected.technicalCaptions : selected.freeTextCaptions)?.[index] || ''} on:input={(event) => onFreeTextCaption(index, event.currentTarget.value)}/></label>
          {/each}
        </div>
      {/if}
      {#if selected.kind === 'corner'}
        <input class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" bind:this={imageInput} on:change={imageChanged}/>
        <button class="button secondary-button fill" on:click={() => imageInput.click()}><Icon name="upload" size={16}/> {selected.imageData ? 'Trocar imagem' : 'Escolher imagem'}</button>
        {#if selected.imageData}<button class="text-action" on:click={() => onImage(undefined)}>Remover imagem</button>{/if}
        {#if imageError}<small class="error-text">{imageError}</small>{/if}
      {/if}
      {#if selected.kind === 'technical' ||
        (selected.kind === 'freeText' && ['technicalBar','fullTechnical','fullPage','legacyPresentationSlide','newsSlide'].includes(selected.freeTextStyle || ''))}
        <h4>Rodapé / Identidade visual</h4>
        <label class="field"><span>Mostrar no rodapé</span>
          <select value={selected.footerMode || 'text'} on:change={event=>onFooter('footerMode',event.currentTarget.value)}>
            <option value="text">Texto personalizado</option>
            <option value="image">Imagem / Logomarca</option>
            <option value="none">Ocultar rodapé</option>
          </select>
        </label>
        {#if (selected.footerMode || 'text') === 'text'}
          <label class="field"><span>Texto do rodapé</span><input type="text" maxlength="100" value={selected.footerText ?? 'RDV BUS'}
            on:input={event=>onFooter('footerText',event.currentTarget.value)}/></label>
        {:else if selected.footerMode === 'image'}
          <input class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" bind:this={footerImageInput} on:change={footerImageChanged}/>
          <button class="button secondary-button fill" on:click={()=>footerImageInput?.click()}><Icon name="upload" size={16}/>{selected.footerImageData?'Trocar logomarca':'Escolher logomarca'}</button>
          {#if selected.footerImageData}<button class="text-action" on:click={()=>onFooter('footerImageData',undefined)}>Remover imagem</button>{/if}
          {#if footerError}<small class="error-text">{footerError}</small>{/if}
          <p class="inspector-hint">PNG com fundo transparente recomendado. A logomarca acompanha a animação e sai no SVG e nos vídeos.</p>
        {/if}
      {/if}
      <h4>Ações do elemento</h4>
      <div class="action-buttons"><button class="button secondary-button" on:click={onDuplicate}><Icon name="copy" size={16}/> Duplicar</button><button class="button danger-button" on:click={onDelete}><Icon name="trash" size={16}/> Excluir</button></div>
    </section>
    {:else if activeTab === 'typography'}
    <section class="property-section"><h3>Tipografia e formatação</h3>
      <label class="field"><span>Fonte do elemento (sistema operacional)</span>
        <select value={selected.style.fontFamily || 'Inter'} on:change={(event)=>onFontFamily(event.currentTarget.value)}>
          {#each Array.from(new Set([selected.style.fontFamily || 'Inter', ...systemFonts])) as family}
            <option value={family}>{family}</option>
          {/each}
        </select>
      </label>
      <p class="inspector-hint">A fonte selecionada vale para todos os textos do elemento; uma fonte aplicada na barra flutuante tem prioridade apenas naquele campo. O projeto guarda o nome da fonte, não seus arquivos.</p>
      <label class="field"><span>Tamanho geral do texto (px)</span><input type="number" min="16" max="110" step="1" value={selected.style.fontSize} on:change={(event) => onStyle('fontSize', Number(event.currentTarget.value))}/></label>
      {#if richEditor}
        <label class="field"><span>Selecionar texto do corpo para formatar</span>
          <textarea rows="6" maxlength="6000" bind:this={bodyEditor} value={selected.fields.line1} on:input={(event) => onField('line1', event.currentTarget.value)}></textarea>
        </label>
      {/if}
      {#if richEditor}
        <div class="rich-tools">
          <h4>Formatação — título</h4>
          <div class="two-fields">
            <label class="field"><span>Tamanho (px)</span><input type="number" min="14" max="140" value={richText.titleSize} on:change={(event)=>onRichText('titleSize', Number(event.currentTarget.value))}/></label>
            <div class="format-toggle-set">
              <button class:format-active={richText.titleBold} title="Negrito no título" aria-pressed={richText.titleBold} on:click={()=>onRichText('titleBold',!richText.titleBold)}><b>N</b></button>
              <button class:format-active={richText.titleItalic} title="Itálico no título" aria-pressed={richText.titleItalic} on:click={()=>onRichText('titleItalic',!richText.titleItalic)}><i>I</i></button>
              <button class:format-active={richText.titleUnderline} title="Sublinhado no título" aria-pressed={richText.titleUnderline} on:click={()=>onRichText('titleUnderline',!richText.titleUnderline)}><u>S</u></button>
            </div>
          </div>
          <h4>Formatação — corpo</h4>
          <div class="two-fields">
            <label class="field"><span>Tamanho (px)</span><input type="number" min="14" max="140" value={richText.bodySize} on:change={(event)=>onRichText('bodySize', Number(event.currentTarget.value))}/></label>
            <div class="format-toggle-set">
              <button class:format-active={richText.bodyBold} title="Negrito no corpo" aria-pressed={richText.bodyBold} on:click={()=>onRichText('bodyBold',!richText.bodyBold)}><b>N</b></button>
              <button class:format-active={richText.bodyItalic} title="Itálico no corpo" aria-pressed={richText.bodyItalic} on:click={()=>onRichText('bodyItalic',!richText.bodyItalic)}><i>I</i></button>
              <button class:format-active={richText.bodyUnderline} title="Sublinhado no corpo" aria-pressed={richText.bodyUnderline} on:click={()=>onRichText('bodyUnderline',!richText.bodyUnderline)}><u>S</u></button>
            </div>
          </div>
          <label class="field"><span>Alinhamento do corpo</span><select value={richText.alignment} on:change={(event)=>onRichText('alignment',event.currentTarget.value)}><option value="left">À esquerda</option><option value="center">Centralizado</option><option value="right">À direita</option><option value="justify">Justificado (experimental)</option></select></label>
          <label class="field"><span>Marcadores por parágrafo</span><select value={richText.bullets} on:change={(event)=>onRichText('bullets',event.currentTarget.value)}><option value="none">Sem marcadores</option><option value="chevrons">» Setas — estilo ficha técnica</option><option value="dots">• Marcadores redondos</option><option value="numbers">1. Lista numerada</option></select></label>
          <h4>Formatar trecho selecionado no corpo</h4>
          <div class="format-toggle-set">
            <button title="Colocar seleção em negrito" on:click={()=>markSelection('**')}><b>Negrito</b></button>
            <button title="Colocar seleção em itálico" on:click={()=>markSelection('*')}><i>Itálico</i></button>
            <button title="Sublinhar seleção" on:click={()=>markSelection('__')}><u>Sublinhado</u></button>
          </div>
          <p class="inspector-hint">Selecione um trecho na caixa Corpo e aplique a formatação. Atalhos salvos: **negrito**, *itálico* e __sublinhado__.</p>
          <h4>Rolagem do conteúdo</h4>
          <label class="field"><span>Tipo</span><select value={richText.scroll} on:change={(event)=>onRichText('scroll',event.currentTarget.value)}><option value="none">Sem rolagem</option><option value="vertical">Vertical, de baixo para cima</option>{#if selected.freeTextStyle !== 'fullPage'}<option value="horizontal">Horizontal, da direita para a esquerda</option>{/if}</select></label>
          {#if richText.scroll !== 'none'}
            <label class="field"><span>Velocidade relativa (%)</span><input type="number" min="25" max="300" step="5" value={richText.scrollSpeed} on:change={(event)=>onRichText('scrollSpeed',Number(event.currentTarget.value))}/></label>
            <p class="inspector-hint">100% faz o conteúdo percorrer a área durante a duração total do projeto. A rolagem acompanha a linha do tempo e a exportação.</p>
          {/if}
        </div>
      {/if}
    </section>
    {:else if activeTab === 'colors'}
    <section class="property-section"><h3>Cores dos textos e do elemento</h3>
      <div class="palette-color-group" aria-label="Cores independentes dos textos">
        <h4>Cores dos textos — independentes</h4>
        <p class="inspector-hint">Defina a cor do título, do corpo e dos textos secundários separadamente. As cores acompanham a paleta atual. Cada alteração afeta apenas o grupo escolhido.</p>
        {#each colorGroups as group}
          <label class="field text-role-picker">
            <span>{group.label}</span>
            <select value={textGroupAsSelected(selected,group.key)} on:change={(event) => onTextGroup(group.key,event.currentTarget.value as TextColorRole)}>
              <option value="original">Cor original deste estilo</option>
              <option value="white">Branco</option>
              <option value="primary">Destaque — cor principal</option>
              <option value="secondary">Cor secundária da paleta</option>
            </select>
          </label>
          <p class="inspector-hint">{group.note}</p>
          <button type="button" class="button secondary-button fill" on:click={()=>onProjectTextGroup(group.key,textGroupAsSelected(selected,group.key))}>Aplicar {group.label.toLowerCase()} a todo o projeto</button>
        {/each}
      </div>
      <h4>Cor de cada campo</h4>
      {#each fieldKeys as field}
        {@const label = selected.kind === 'freeText' && (selected.freeTextStyle || 'classic') !== 'classic'
          ? field === 'heading' ? 'Título' : richEditor && field === 'line1' ? 'Corpo do texto' : `Texto ${field.replace('line','')}`
          : richEditor && field === 'line1' ? 'Corpo do texto' : labels[field] || field}
        <label class="field text-role-picker"><span>Cor de {label.toLowerCase()}</span>
          <select value={colorAsSelected(selected,field)} on:change={(event)=>onTextColor(field,event.currentTarget.value as TextColorRole)}>
            <option value="original">Padrão original do estilo</option>
            <option value="white">Branco</option>
            <option value="primary">Cor principal (destaque)</option>
            <option value="secondary">Cor secundária</option>
          </select>
        </label>
      {/each}
      <div class="palette-color-group">
        <label class="field"><span>Cor de todos os textos deste elemento</span>
          <select bind:value={allSelectedRole}>
            <option value="white">Branco</option>
            <option value="primary">Cor principal (destaque)</option>
            <option value="secondary">Cor secundária</option>
            <option value="original">Restaurar padrão original</option>
          </select>
        </label>
        <button type="button" class="button secondary-button fill" on:click={()=>onAllSelectedText(allSelectedRole)}>Aplicar a todos os textos deste elemento</button>
      </div>
      {#if selected.kind === 'technical' || (selected.kind === 'freeText' && ['technicalBar','technicalAlpha1','fullTechnical'].includes(selected.freeTextStyle || 'classic'))}
        <div class="caption-fields">
          <h4>Cor de cada rótulo</h4>
          {#each Array.from({ length: selected.kind === 'technical' || selected.freeTextStyle === 'technicalBar' || selected.freeTextStyle === 'fullTechnical' ? 6 : 4 }, (_, i) => i) as index}
            <label class="field text-role-picker"><span>Cor do rótulo {index+1}</span>
              <select value={colorAsSelected(selected,('caption'+index) as TextColorKey)} on:change={event=>onTextColor(('caption'+index) as TextColorKey,event.currentTarget.value as TextColorRole)}>
                <option value="original">Padrão original</option><option value="white">Branco</option><option value="primary">Destaque</option><option value="secondary">Secundária</option>
              </select>
            </label>
          {/each}
        </div>
      {/if}
      <label class="field"><span>Cor principal deste elemento</span><div class="color-control"><input type="color" value={selected.style.accent} on:input={(event) => onStyle('accent', event.currentTarget.value)}/><code>{selected.style.accent}</code></div></label>
      <label class="field"><span>Cor secundária deste elemento</span><div class="color-control"><input type="color" value={selected.style.secondary || DEFAULT_PALETTE.colors.secondary} on:input={(event) => onStyle('secondary', event.currentTarget.value)}/><code>{selected.style.secondary || DEFAULT_PALETTE.colors.secondary}</code></div></label>
      <label class="field"><span>Fundo deste elemento</span><div class="color-control"><input type="color" value={selected.style.background} on:input={(event) => onStyle('background', event.currentTarget.value)}/><code>{selected.style.background}</code></div></label>
      <p class="inspector-hint">Estas alterações afetam apenas o elemento selecionado. Use a paleta do projeto para atualizar todas as seções simultaneamente, inclusive por RGB e HEX.</p>
    </section>
    {:else if activeTab === 'dimensions'}
    <section class="property-section"><h3>Dimensões e posição</h3>
      <div class="two-fields">
        <label class="field"><span>Largura</span><input disabled={isFullscreen || bottomBar} type="number" min={selected.kind === 'technical' || (selected.kind === 'freeText' && selected.freeTextStyle === 'technicalBar') ? 640 : 140} max="1600" step="1" value={selected.style.width} on:change={(event) => onStyle('width', Number(event.currentTarget.value))}/></label>
      </div>
      <div class="two-fields">
        <label class="field"><span>Escala horizontal (%)</span><input type="number" min="20" max="400" step="1" disabled={isFullscreen || bottomBar} value={Math.round(selected.style.scaleX*100)} on:change={(event) => onStyle('scaleX', Number(event.currentTarget.value)/100)}/></label>
        <label class="field"><span>Escala vertical (%)</span><input type="number" min={bottomBar?75:20} max={bottomBar?140:400} step="1" disabled={isFullscreen} value={Math.round(selected.style.scaleY*100)} on:change={(event) => onStyle('scaleY', Number(event.currentTarget.value)/100)}/></label>
      </div>
      <button class="text-action" disabled={isFullscreen} on:click={onResetScale}>Restaurar escala 100%</button>
      <p class="inspector-hint">{isFullscreen ? 'Este modelo ocupa toda a tela; altere para faixa lateral/cartela para dimensioná-lo.' : 'Arraste as alças douradas na pré-visualização para redimensionar. As fontes agora mantêm as proporções.'}</p>

      <label class="field"><span class="range-head">Opacidade <b>{selected.style.opacity}%</b></span><input type="range" min="0" max="100" step="1" value={selected.style.opacity} on:input={(event) => onStyle('opacity', Number(event.currentTarget.value))}/></label>
      {#if bottomBar}<p class="inspector-hint">Em 9:16, a faixa técnica se ajusta automaticamente à parte inferior. Use escala vertical ou a alça superior para ajustar sua altura.</p>{/if}
      {#if !bottomBar && ((selected.kind === 'technical' && !['fullscreen','legacyFullscreen'].includes(selected.technicalLayout || '')) || (selected.kind === 'freeText' && selected.freeTextStyle === 'technicalBar'))}
        <label class="field"><span>Lado da faixa técnica</span><select value={selected.technicalSide || 'left'} on:change={(event) => onTechnicalSide(event.currentTarget.value as 'left' | 'right')}><option value="left">Esquerdo — referência B 692</option><option value="right">Direito — referência 1171</option></select></label>
      {/if}
      <div class="two-fields">
        <label class="field"><span>Posição X</span><input disabled={isFullscreen || bottomBar} type="number" min="0" max={project.canvas.width} value={selected.style.x} on:change={(event) => onStyle('x', Number(event.currentTarget.value))}/></label>
        <label class="field"><span>Posição Y</span><input disabled={isFullscreen || bottomBar} type="number" min="0" max={project.canvas.height} value={selected.style.y} on:change={(event) => onStyle('y', Number(event.currentTarget.value))}/></label>
      </div>
      {#if isCompactCartela(selected)}
        <div class="palette-color-group">
          <h4>Cartela de referência: crédito de filmagem</h4>
          <p class="inspector-hint">Tamanho padrão: {CREDIT_CARD_WIDTH} × {CREDIT_CARD_HEIGHT} px. As cartelas compactas de localização, data, linha, motorista, crédito e etiqueta de texto livre seguem esta referência. Slides e fichas técnicas mantêm seus próprios tamanhos.</p>
          <button type="button" class="button secondary-button fill" on:click={onStandardizeSelected}>Usar tamanho da cartela de créditos</button>
          <button type="button" class="button secondary-button fill" on:click={onStandardizeAll}>Padronizar todas as cartelas do projeto</button>
        </div>
      {/if}
    </section>
    {:else if activeTab === 'motion'}
    <section class="property-section"><h3>Animação e rolagem</h3>
      <label class="field"><span>Entrada e saída</span><select value={selected.animation} on:change={(event) => onAnimation(event.currentTarget.value as HudElement['animation'])}><option value="legacy">Animação original 0.14 — por camadas</option><option value="slide">Deslizamento HUD (Studio)</option><option value="fade">Fade suave</option><option value="none">Sem animação</option><option value="curtain">Cortina · Revelar lateralmente</option><option value="zoom">Zoom de Estúdio</option><option value="split">Revelação Central</option></select></label>
      {#if isCompactCartela(selected) || (selected.kind==='freeText' && selected.freeTextStyle==='classic')}
        <label class="field"><span>Brilho após a entrada (somente cartelas)</span>
          <select value={selected.shineEnabled!==false?'on':'off'} on:change={event=>onShineToggle(event.currentTarget.value==='on')}>
            <option value="on">Ligado</option><option value="off">Desligado</option>
          </select>
        </label>
      {/if}
      {#if isBar(selected)}
        <label class="field"><span>Brilho nas linhas diagonais da ficha técnica</span>
          <select value={selected.diagonalGlowEnabled===true?'on':'off'} on:change={event=>onDiagonalGlowToggle(event.currentTarget.value==='on')}>
            <option value="off">Desligado (padrão)</option><option value="on">Ligado</option>
          </select>
        </label>
        <label class="field">
          <span>Intensidade do brilho diagonal: {selected.diagonalGlowIntensity ?? 170}%</span>
          <input type="range" min="50" max="300" step="10" value={selected.diagonalGlowIntensity ?? 170}
            on:input={event=>onDiagonalGlowIntensity(Number(event.currentTarget.value))}/>
        </label>
      {/if}
      <p class="inspector-hint">Brilho de varredura apenas nas cartelas. Nas fichas técnicas, somente as diagonais recebem brilho, com intensidade ajustável.</p>
      {#if selected.kind === 'freeText' && ['legacyLabel','legacyHalfBar','legacyFullBar'].includes(selected.freeTextStyle || '')}
        <div class="rich-tools">
          <h4>Rolagem original — linhas independentes</h4>
          <label class="field"><span>Linha 1</span><select value={richText.scrollLine1?'on':'off'} on:change={(event)=>onRichText('scrollLine1',event.currentTarget.value==='on')}><option value="off">Parada</option><option value="on">Rolando ◀</option></select></label>
          <label class="field"><span>Linha 2</span><select value={richText.scrollLine2?'on':'off'} on:change={(event)=>onRichText('scrollLine2',event.currentTarget.value==='on')}><option value="off">Parada</option><option value="on">Rolando ◀</option></select></label>
          <div class="two-fields">
            <label class="field"><span>Velocidade (px/s)</span><input type="number" min="30" max="1400" step="10" value={richText.scrollPixelsPerSecond} on:change={(event)=>onRichText('scrollPixelsPerSecond', Number(event.currentTarget.value))}/></label>
            <label class="field"><span>Repetições</span><input type="number" min="1" max="20" step="1" value={richText.scrollRepeats} on:change={(event)=>onRichText('scrollRepeats', Number(event.currentTarget.value))}/></label>
          </div>
          <label class="field"><span>Distância entre repetições (px)</span><input type="number" min="0" max="1000" step="10" value={richText.scrollGap} on:change={(event)=>onRichText('scrollGap', Number(event.currentTarget.value))}/></label>
          <button type="button" class="button secondary-button fill" on:click={onFitScrollDuration}>Ajustar duração para completar a rolagem</button>
          <p class="inspector-hint">Velocidade em px/s e repetições, como no RDV Bus 0.14. O botão ajusta a duração global da composição (até 30 segundos), incluindo entrada e saída.</p>
        </div>
      {/if}
    </section>
    {:else if activeTab === 'palette'}
      <PalettePanel palette={project.palette || DEFAULT_PALETTE} onPreset={onPalettePreset} onColor={onPaletteColor} onAllText={onAllProjectText} />
    {/if}
  {:else}
    <div class="inspector-tabs" role="tablist" aria-label="Configurações do projeto">
      <button type="button" role="tab" class:inspector-tab-active={activeTab === 'project'} aria-selected={activeTab === 'project'} on:click={() => activeTab = 'project'}>Vídeo</button>
      <button type="button" role="tab" class:inspector-tab-active={activeTab === 'palette'} aria-selected={activeTab === 'palette'} on:click={() => activeTab = 'palette'}>Paleta</button>
    </div>
    {#if activeTab === 'palette'}
      <PalettePanel palette={project.palette || DEFAULT_PALETTE} onPreset={onPalettePreset} onColor={onPaletteColor} onAllText={onAllProjectText} />
    {:else}
    <div class="selected-heading"><div class="selected-icon"><Icon name="layout" size={23}/></div><div><strong>Projeto</strong><small>Configurações gerais</small></div></div>
    <section class="property-section"><h3>Vídeo</h3>
      <label class="field"><span>Formato da composição</span><select value={project.canvas.width === 1080 ? 'portrait' : 'landscape'} on:change={(event) => onCanvas('orientation', event.currentTarget.value)}><option value="landscape">Horizontal · 1920 × 1080</option><option value="portrait">Vertical · 1080 × 1920</option></select></label>
      <label class="field"><span>Taxa de quadros</span><select value={project.canvas.fps} on:change={(event) => onCanvas('fps', Number(event.currentTarget.value))}><option value="60">60 FPS</option><option value="30">30 FPS</option></select></label>
      <label class="field"><span>Duração (segundos)</span><input type="number" min="1" max="30" step="0.1" value={project.canvas.duration} on:change={(event) => onCanvas('duration', Number(event.currentTarget.value))}/></label>
    </section>
      <section class="property-section"><h3>Cartelas compactas</h3>
        <p class="inspector-hint">Padronize localização, data, linha, motorista, crédito e etiqueta livre com as dimensões da cartela de crédito (550 × 102 px). Não altera os modos especiais.</p>
        <button type="button" class="button secondary-button fill" on:click={onStandardizeAll}>Padronizar cartelas existentes</button>
      </section>
      <section class="property-section"><h3>Sobre esta versão</h3><p class="info-copy">Editor vetorial SVG com paletas personalizáveis. Exportação de vídeo pelo Tauri.</p></section>
    {/if}
  {/if}
</div>
