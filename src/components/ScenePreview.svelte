<script lang="ts">
  import { tick } from 'svelte';
  import HudShape from './HudShape.svelte';
  import type { TextField, TextFormatting, TextAlign, BulletMode } from '../lib/types';
  import { wrapSelectedText, type EditableTextKey } from '../lib/inlineText';
  import { motionAt, clamp } from '../lib/timing';
  import { BRAND } from '../lib/brand';
  import { fontStack } from '../lib/fonts';
  import { isBottomBar, PORTRAIT_BAR_HEIGHT } from '../lib/geometry';
  import type { HudElement, HudStyle, RDVProject } from '../lib/types';
  import { boundsOf, elementBaseHeight, isBar, resizeBounds, type ElementBounds, type ResizeHandle } from '../lib/geometry';

  export let project: RDVProject;
  export let systemFonts: string[] = [];
  export let selectedId: string | null;
  export let time: number;
  export let onSelect: (id: string) => void;
  export let onMove: (id: string, x: number, y: number) => void;
  export let onResize: (id: string, change: Partial<HudStyle>) => void = () => {};
  export let onEditField: (id: string, field: TextField, value: string) => void = () => {};
  export let onEditCaption: (id: string, index: number, value: string) => void = () => {};
  export let onTextFormat: (id: string, key: EditableTextKey, format: Partial<TextFormatting>) => void = () => {};
  export let onParagraphFormat: (id: string, key: TextField, type: 'alignment' | 'bullets', value: TextAlign | BulletMode) => void = () => {};
  export let onBeginEdit: () => void = () => {};

  let svg: SVGSVGElement;
  let container: HTMLDivElement;
  let textarea: HTMLTextAreaElement;
  type EditState = { id: string; key: EditableTextKey; original: string;
    x: number; y: number; width: number; height: number;
    baseSize: number; originalBold: boolean; originalItalic: boolean; originalUnderline: boolean; multiline: boolean };
  let editing: EditState | null = null;
  let draftText = '';
  let activeEditElement: HudElement | undefined;
  let activeFormatting: TextFormatting | undefined;
  $: activeEditElement = editing ? project.elements.find(item => item.id === editing?.id) : undefined;
  $: activeFormatting = (activeEditElement && editing ? activeEditElement.textFormatting?.[editing.key] : undefined);

  function richBody(element: HudElement, key: EditableTextKey): boolean {
    return element.kind === 'freeText' && key === 'line1' &&
      ['classic', 'fullPage', 'legacyPresentationBar', 'legacyPresentationSlide'].includes(element.freeTextStyle || 'classic');
  }
  function editableKey(node: Element): EditableTextKey | null {
    const field = node.getAttribute('data-edit-field');
    if (field && /^(heading|line[1-6])$/.test(field)) return field as TextField;
    const cap = node.getAttribute('data-edit-caption');
    return cap !== null && /^[0-5]$/.test(cap) ? (`caption${cap}` as EditableTextKey) : null;
  }
  function startTextEdit(event: PointerEvent, element: HudElement, target: SVGTextElement, key: EditableTextKey): void {
    event.preventDefault(); event.stopPropagation();
    if (!container) return;
    onBeginEdit(); onSelect(element.id);
    const rect = target.getBoundingClientRect();
    const parent = container.getBoundingClientRect();
    const width = Math.min(Math.max(190, rect.width + 32), Math.max(190, parent.width - 12));
    const x = clamp(rect.left - parent.left - 9, 5, Math.max(5, parent.width - width - 5));
    const y = clamp(rect.top - parent.top - 5, 5, Math.max(5, parent.height - 40));
    const isCaption = key.startsWith('caption');
    const captionIndex = isCaption ? Number(key.slice(7)) : -1;
    const initial = isCaption ? ((element.kind === 'freeText' ? element.freeTextCaptions : element.technicalCaptions)?.[captionIndex]
      ?? ['CARROCERIA','MODELO','CHASSI','MODELO','EMPRESA','PREFIXO'][captionIndex] ?? '')
      : (element.fields[key as TextField] || '');
    const computed = getComputedStyle(target);
    const size = parseFloat(computed.fontSize) || 32;
    editing = { id: element.id, key, original: initial, x, y, width,
      height: richBody(element,key) ? Math.min(145, Math.max(80,parent.height-y-12)) : 40,
      baseSize: Math.round(size), originalBold: Number(computed.fontWeight) >= 600,
      originalItalic: computed.fontStyle === 'italic', originalUnderline: computed.textDecorationLine.includes('underline'),
      multiline: richBody(element,key) };
    draftText = initial;
    void tick().then(() => { if (textarea) { textarea.focus(); textarea.select(); } });
  }
  function applyText(value: string): void {
    if (!editing) return;
    draftText = value;
    if (editing.key.startsWith('caption')) onEditCaption(editing.id, Number(editing.key.slice(7)), value);
    else onEditField(editing.id, editing.key as TextField, value);
  }
  function stopEditing(cancel=false): void {
    if (!editing) return;
    if (cancel) applyText(editing.original);
    editing = null;
  }
  function formatOn(key: 'bold' | 'italic' | 'underline'): boolean {
    return (activeFormatting?.[key] ?? (editing ? (key === 'bold' ? editing.originalBold : key === 'italic' ? editing.originalItalic : editing.originalUnderline) : false)) === true;
  }
  async function toggleFormat(key: 'bold' | 'italic' | 'underline'): Promise<void> {
    if (!editing || !activeEditElement) return;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    if (richBody(activeEditElement,editing.key) && end > start) {
      applyText(wrapSelectedText(draftText,start,end,key));
      await tick();
      textarea?.focus();
      textarea?.setSelectionRange(start,end+(key === 'bold' || key === 'underline' ? 4 : 2));
    } else {
      onTextFormat(editing.id, editing.key, { [key]: !formatOn(key) });
      await tick(); textarea?.focus();
    }
  }
  function setFontFamily(value: string): void {
    // O callback de change pode ser executado depois de o usuário fechar o editor.
    // O estado precisa ser verificado no momento do evento, não só no bloco {#if}.
    if (!editing) return;
    onTextFormat(editing.id, editing.key, { family: value });
  }
  function setFontSize(value: number): void {
    if (!editing || !Number.isFinite(value)) return;
    onTextFormat(editing.id,editing.key,{size:clamp(value,9,180)});
  }
  function setParagraph(key: 'alignment' | 'bullets', value: TextAlign | BulletMode): void {
    if (editing && editing.key === 'line1') onParagraphFormat(editing.id,'line1',key,value);
  }
  function editKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && ['b','i','u'].includes(key)) {
      event.preventDefault(); void toggleFormat(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline');
    } else if (event.key === 'Escape') { event.preventDefault(); stopEditing(true); }
    else if (event.key === 'Enter' && (!editing?.multiline || event.ctrlKey || event.metaKey)) { event.preventDefault(); stopEditing(); }
  }

  type DragState = { id: string; pointerId: number; mx: number; my: number; x: number; y: number };
  type ResizeState = { id: string; pointerId: number; mx: number; my: number;
    bounds: ElementBounds; baseWidth: number; baseHeight: number; handle: ResizeHandle;
    technical: boolean; bottom: boolean; side: 'left' | 'right' };
  let dragging: DragState | null = null;
  let resizing: ResizeState | null = null;
  const ALL_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
  const BOTTOM_BAR_HANDLES: ResizeHandle[] = ['n'];
  const LEFT_TECH_HANDLES: ResizeHandle[] = ['e', 'se', 's'];
  const RIGHT_TECH_HANDLES: ResizeHandle[] = ['w', 'sw', 's'];
  const resizeCursors: Record<ResizeHandle, string> = {
    nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
    n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  };
  function handleX(handle: ResizeHandle, width: number): number { return handle.includes('w') ? 0 : handle.includes('e') ? width : width/2; }
  function handleY(handle: ResizeHandle, height: number): number { return handle.includes('n') ? 0 : handle.includes('s') ? height : height/2; }

  function stagePosition(event: PointerEvent): { x: number; y: number } | null {
    if (!svg) return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const result = p.matrixTransform(matrix.inverse());
    return { x: result.x, y: result.y };
  }

  function beginDrag(event: PointerEvent, element: HudElement): void {
    if (event.button !== 0) return;
    const clicked = event.target instanceof Element ? event.target.closest('text[data-edit-field],text[data-edit-caption]') : null;
    if (clicked instanceof SVGTextElement) {
      const key = editableKey(clicked);
      if (key) { startTextEdit(event,element,clicked,key); return; }
    }
    if (editing) stopEditing();
    event.stopPropagation();
    const point = stagePosition(event);
    if (!point) return;
    onSelect(element.id);
    dragging = { id: element.id, pointerId: event.pointerId, mx: point.x, my: point.y, x: element.style.x, y: element.style.y };
    svg.setPointerCapture(event.pointerId);
  }

  function beginResize(event: PointerEvent, element: HudElement, handle: ResizeHandle): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = stagePosition(event);
    if (!point) return;
    dragging = null;
    onSelect(element.id);
    resizing = {
      id: element.id, pointerId: event.pointerId, mx: point.x, my: point.y,
      bounds: boundsOf(element, project.canvas.height),
      baseWidth: element.style.width, baseHeight: elementBaseHeight(element, project.canvas.height),
      handle, technical: isBar(element), bottom:isBottomBar(element,project.canvas.width,project.canvas.height), side: element.technicalSide || 'left',
    };
    svg.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent): void {
    if (resizing && event.pointerId === resizing.pointerId) {
      const p = stagePosition(event);
      if (!p) return;
      const r = resizing;
      const dx = p.x - r.mx;
      const dy = p.y - r.my;
      if (r.bottom) {
        const newH = clamp(r.bounds.height - dy, PORTRAIT_BAR_HEIGHT*.75, PORTRAIT_BAR_HEIGHT*1.4);
        onResize(r.id, {scaleY:Math.round(newH/PORTRAIT_BAR_HEIGHT*1000)/1000,
          scaleX:1, width:project.canvas.width, x:0,y:Math.round(project.canvas.height-newH)});
      } else if (r.technical) {
        const deltaWidth = (r.side === 'right' ? -dx : dx);
        const width = r.handle === 's' ? r.bounds.width : clamp(r.bounds.width + deltaWidth, r.baseWidth * .2, Math.min(r.baseWidth * 4, project.canvas.width));
        const height = r.handle === 'e' || r.handle === 'w' ? r.bounds.height
          : clamp(r.bounds.height + dy, r.baseHeight * .2, r.baseHeight);
        onResize(r.id, {scaleX: Math.round(width / r.baseWidth * 1000)/1000,
          scaleY: Math.round(height / r.baseHeight * 1000)/1000,
          x: r.side === 'right' ? Math.round(project.canvas.width - width) : 0, y: 0 });
      } else {
        const result = resizeBounds(r.bounds, r.handle, dx, dy, project.canvas.width, project.canvas.height, event.shiftKey);
        onResize(r.id, {
          x: Math.round(result.x), y: Math.round(result.y),
          scaleX: Math.round(result.width / r.baseWidth * 1000)/1000,
          scaleY: Math.round(result.height / r.baseHeight * 1000)/1000,
        });
      }
      return;
    }
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const p = stagePosition(event);
    if (!p) return;
    onMove(dragging.id, Math.round(clamp(dragging.x + p.x - dragging.mx, 0, project.canvas.width)), Math.round(clamp(dragging.y + p.y - dragging.my, 0, project.canvas.height)));
  }

  function endDrag(event: PointerEvent): void {
    if (resizing && resizing.pointerId === event.pointerId) { resizing = null; if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId); }
    if (dragging && dragging.pointerId === event.pointerId) {
      dragging = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    }
  }
  // IDs de clip únicos por instância: preview e exportação coexistem no DOM.
  const clipInstanceId = Math.random().toString(36).slice(2);
</script>

<div class="scene-edit-container" bind:this={container}>
<svg
  bind:this={svg}
  class="scene-svg"
  viewBox={`0 0 ${project.canvas.width} ${project.canvas.height}`}
  preserveAspectRatio="xMidYMid meet"
  aria-label="Pré-visualização: arraste para mover e use as alças para redimensionar"
  role="img"
  on:pointermove={moveDrag}
  on:pointerup={endDrag}
  on:pointercancel={endDrag}
>
  {#each project.elements.filter(item => item.visible) as element (element.id)}
    <!-- A animação original é interna ao HUD, tanto no Studio quanto no Clássico.
         O movimento da cena serve apenas aos demais tipos de transição. -->
    {@const motion = motionAt(time, project.canvas.duration, element.animation)}
    {@const totalAlpha = (element.style.opacity / 100) * motion.alpha}
    {@const motionWidth = element.style.width*element.style.scaleX}
    {@const motionHeight = elementBaseHeight(element,project.canvas.height)*element.style.scaleY}
    {@const motionClipId = `rdv-motion-${clipInstanceId}-${element.id.replace(/[^a-zA-Z0-9_-]/g,'')}`}
    {@const clipped = element.animation === 'curtain' || element.animation === 'split'}
    <g
      transform={`translate(${element.style.x + (isBottomBar(element,project.canvas.width,project.canvas.height) ? 0 : motion.shiftX * (isBar(element) && element.technicalSide === 'right' ? -1 : 1))} ${element.style.y + (isBottomBar(element,project.canvas.width,project.canvas.height) ? Math.abs(motion.shiftX) : 0)})`}
      opacity={totalAlpha}
      class:draggable={true}
      on:pointerdown={(event) => beginDrag(event, element)}
      role="button"
      tabindex="0"
      aria-label={`Selecionar ${element.title}`}
      on:keydown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(element.id); }}
    >
      <defs><clipPath id={motionClipId}><rect
        x={element.animation==='split'?(motionWidth*(1-motion.reveal))/2:0}
        y="0" width={motionWidth*motion.reveal} height={motionHeight}/></clipPath></defs>
      <g transform={`translate(${motionWidth/2} ${motionHeight/2}) scale(${motion.scale}) translate(${-motionWidth/2} ${-motionHeight/2})`}>
        <g clip-path={clipped?`url(#${motionClipId})`:undefined}>
          <HudShape {element} canvasHeight={project.canvas.height} {time} duration={project.canvas.duration} canvasWidth={project.canvas.width}/>
        </g>
      </g>
      {#if selectedId === element.id}
        {@const baseH = elementBaseHeight(element, project.canvas.height)}
        <rect data-editor-overlay="true" x="0" y="0"
          width={element.style.width*element.style.scaleX} height={baseH*element.style.scaleY}
          fill="transparent" stroke={BRAND.goldLight} stroke-width="3"
          stroke-dasharray="12 8" pointer-events="none"/>
        {#if !((element.kind === 'technical' && ['fullscreen','legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && (element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'fullTechnical' || element.freeTextStyle === 'legacyPresentationSlide')))}
        {#each (isBottomBar(element,project.canvas.width,project.canvas.height) ? BOTTOM_BAR_HANDLES : isBar(element) ? (element.technicalSide === 'right' ? RIGHT_TECH_HANDLES : LEFT_TECH_HANDLES) : ALL_HANDLES) as handle}
          <rect data-editor-overlay="true" class="resize-handle"
            x={handleX(handle, element.style.width*element.style.scaleX)-10} y={handleY(handle, baseH*element.style.scaleY)-10}
            width="20" height="20" rx="3"
            fill={BRAND.goldLight} stroke="#241029" stroke-width="2"
            style={`cursor:${resizeCursors[handle]}`}
            on:pointerdown={(event) => beginResize(event, element, handle)}
            role="button" tabindex="0"
            aria-label={`Redimensionar ${element.title} pela alça ${handle}`}
            on:keydown={(event) => { if (event.key === 'Enter') onSelect(element.id); }}
          />
        {/each}
        {/if}
      {/if}
    </g>
  {/each}
</svg>

{#if editing && activeEditElement && selectedId === editing.id}
  <div class="inline-editor" style={`left:${editing.x}px;top:${editing.y}px;width:${editing.width}px`}>
    <textarea bind:this={textarea} value={draftText} rows={editing.multiline ? 4 : 1}
      style={`min-height:${editing.height}px;font-family:${fontStack(activeFormatting?.family || activeEditElement.style.fontFamily)};font-size:${Math.min(19,Math.max(13,editing.baseSize * (container?.clientWidth || 900)/project.canvas.width))}px`}
      aria-label={`Editar ${editing.key} diretamente na pré-visualização`}
      spellcheck="true"
      on:input={(event) => applyText(event.currentTarget.value)}
      on:keydown={editKeydown}></textarea>
  </div>
  <div class="floating-format" role="toolbar" tabindex="0" aria-label="Formatação de texto"
    style={`left:${Math.max(5,Math.min(editing.x,Math.max(5,(container?.clientWidth||600)-520)))}px;top:${editing.y>60?editing.y-46:editing.y+editing.height+5}px`}
    on:pointerdown={(event)=> { if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement)) event.preventDefault(); }}>
    <button title="Negrito (Ctrl+B)" class:enabled={formatOn('bold')} on:click={() => void toggleFormat('bold')} aria-label="Negrito"><b>B</b></button>
    <button title="Itálico (Ctrl+I)" class:enabled={formatOn('italic')} on:click={() => void toggleFormat('italic')} aria-label="Itálico"><i>I</i></button>
    <button title="Sublinhado (Ctrl+U)" class:enabled={formatOn('underline')} on:click={() => void toggleFormat('underline')} aria-label="Sublinhado"><u>U</u></button>
    <span class="format-separator"></span>
    <select aria-label="Fonte do texto" title="Família tipográfica do campo selecionado"
      value={activeFormatting?.family || activeEditElement.style.fontFamily || 'Inter'}
      on:change={(event) => setFontFamily(event.currentTarget.value)}>
      {#each Array.from(new Set([activeFormatting?.family || activeEditElement.style.fontFamily || 'Inter', ...systemFonts])) as name}
        <option value={name}>{name}</option>
      {/each}
    </select>
    <input type="number" min="9" max="180" step="1" aria-label="Tamanho da fonte" title="Tamanho da fonte em pixels do vídeo"
      value={activeFormatting?.size ?? editing.baseSize} on:change={(event)=>setFontSize(Number(event.currentTarget.value))}/>
    {#if editing.multiline}
      <span class="format-separator"></span>
      <button title="Alinhar à esquerda" on:click={() => setParagraph('alignment','left')}>≡</button>
      <button title="Centralizar" on:click={() => setParagraph('alignment','center')}>☷</button>
      <button title="Alinhar à direita" on:click={() => setParagraph('alignment','right')}>≣</button>
      <button title="Marcadores" on:click={() => setParagraph('bullets',activeEditElement.richText?.bullets==='dots'?'none':'dots')}>•</button>
    {/if}
    <button class="format-ok" title="Concluir edição" aria-label="Concluir edição" on:click={() => stopEditing()}>✓</button>
    <button title="Cancelar alterações" aria-label="Cancelar edição" on:click={() => stopEditing(true)}>×</button>
  </div>
{/if}
</div>

<style>
  .scene-edit-container { position: relative; width: 100%; height: 100%; }
  .inline-editor { position:absolute;z-index:25;min-width:160px;pointer-events:auto; }
  .inline-editor textarea { width:100%;display:block;resize:vertical;box-sizing:border-box; padding:8px 10px;
    color:#fff8ea;background:#23162def;border:2px solid #f1c667;border-radius:7px;outline:0;
    font:700 14px/1.3 Inter, Arial, sans-serif;box-shadow:0 7px 21px #0009; }
  .floating-format { position:absolute;z-index:26;display:flex;align-items:center;gap:3px;padding:5px;
    border:1px solid #b69254;border-radius:9px;background:#26172ff7;box-shadow:0 8px 26px #000b;
    max-width:calc(100% - 10px);min-height:35px;flex-wrap:wrap; }
  .floating-format button { border:1px solid transparent;color:#f4e6f8;background:transparent;cursor:pointer;
    min-width:26px;height:26px;border-radius:5px;font-size:12px; }
  .floating-format button:hover,.floating-format button.enabled { background:#76572c;color:white;border-color:#e2ba5a; }
  .floating-format select { max-width:156px; height:27px; border-radius:4px; background:#3d2945; color:#fff;
    border:1px solid #684875; font-size:12px; }
  .floating-format select option { background:#31203b; color:#fff; }
  .floating-format input { width:45px;height:27px;border-radius:4px;background:#3d2945;color:#fff;
    border:1px solid #684875;text-align:center;font-size:12px; }
  .format-separator { height:19px;border-left:1px solid #705278;margin:0 3px; }
  .floating-format .format-ok { background:#c69a47;color:#2c1735; }

  .scene-svg { display: block; width: 100%; height: 100%; user-select: none; touch-action: none; }
  .draggable { cursor: move; outline: none; }
  .draggable:focus-visible { filter: drop-shadow(0 0 8px #e2ba5a); }
  .resize-handle { pointer-events: all; }
  .resize-handle:hover { fill: #fff3ca; }
</style>
