<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { isTauri } from '@tauri-apps/api/core';
  import { save as nativeSave } from '@tauri-apps/plugin-dialog';
  import { writeTextFile } from '@tauri-apps/plugin-fs';
  import { getOutputDirectory, joinOutputPath, openOutputDirectory, rememberOutputFile } from './lib/output';
  import Icon from './components/Icon.svelte';
  import LibraryPanel from './components/LibraryPanel.svelte';
  import PropertiesPanel from './components/PropertiesPanel.svelte';
  import ScenePreview from './components/ScenePreview.svelte';
  import Timeline from './components/Timeline.svelte';
  import { duplicateElement, makeElement, newProject } from './lib/templates';
  import { APP_VERSION } from './lib/types';
  import { clamp, exportFrameTime } from './lib/timing';
  import { isBar, isBottomBar, PORTRAIT_BAR_HEIGHT } from './lib/geometry';
  import { FALLBACK_FONTS, fontStack, normalizeFontName } from './lib/fonts';
  import { getSystemFontFamilies } from './lib/systemFonts';
  import { DEFAULT_RICH_TEXT } from './lib/richtext';
  import { DEFAULT_PALETTE, PALETTE_PRESETS, parseColor, withTextGroupColor } from './lib/palette';
  import type { EditableTextKey } from './lib/inlineText';
  import { legacyScrollRecommendedDuration } from './lib/legacy';
  import { beginVideo, pushVideoFrame, finishVideo, cancelVideo, exportFrameSvg, svgToPngBase64, VIDEO_FORMATS, type VideoFormat, type RasterQuality, type ExportBackground } from './lib/video';
  import { MAX_ELEMENTS, type TextFormatting, type TextAlign, type BulletMode, type ElementKind, type FreeTextStyle, type RichTextSettings, type TechnicalLayout, type HudElement, type HudStyle, type RDVProject, type TextField, type TextColorKey, type TextColorRole, type TextColorGroup, type PaletteColors, type PaletteId, type UiStatus } from './lib/types';
  import { isDesktop, loadAutosave, openProjectBrowser, openProjectNative, saveProject, writeAutosave } from './lib/projects';

  let project: RDVProject = loadAutosave();
  let selectedId: string | null = project.elements[0]?.id || null;
  let time = 1.65;
  let playing = false;
  let lastFrame: number | null = null;
  let frameHandle: number | null = null;
  let fileInput: HTMLInputElement;
  let status: UiStatus | null = null;
  let statusTimer: ReturnType<typeof setTimeout> | null = null;
  let showHelp = false;
  let showSettings = false;
  let showLibrary = true;
  let previewBackground: 'black' | 'checker' = 'black';
  let autosaveOk = true;
  let showExportVideo = false;
  let videoFormat: VideoFormat = 'mov-qtrle';
  let rasterQuality: RasterQuality = 2;
  let exportBackground: ExportBackground = 'transparent';
  let exportingVideo = false;
  let cancelRequested = false;
  let exportProgress = 0;
  let exportTime = 0;
  let selectedVideoName = '';
  let systemFonts: string[] = [...FALLBACK_FONTS];
  let outputDirectory = '';
  onMount(() => {
    void getSystemFontFamilies().then(fonts => { systemFonts = fonts; });
    if (isDesktop()) void getOutputDirectory().then(path => { outputDirectory = path; }).catch(error => notify(`Pasta de saída indisponível: ${error}`, 'error'));
  });

  $: selected = project.elements.find(element => element.id === selectedId) || null;
  $: autosaveOk = writeAutosave(project);
  $: totalFrames = Math.round(project.canvas.duration * project.canvas.fps);

  function notify(text: string, kind: UiStatus['kind'] = 'info'): void {
    status = { kind, text };
    if (statusTimer !== null) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status = null; }, 4800);
  }

  function applyChange(next: RDVProject): void {
    project = { ...next, appVersion: APP_VERSION, updatedAt: new Date().toISOString() };
  }

  function changeElement(id: string, fn: (element: HudElement) => HudElement): void {
    applyChange({ ...project, elements: project.elements.map(element => element.id === id ? fn(element) : element) });
  }

  function addElement(kind: ElementKind): void {
    if (project.elements.length >= MAX_ELEMENTS) return notify(`Limite de ${MAX_ELEMENTS} elementos atingido.`, 'error');
    const element = makeElement(kind);
    const colors = project.palette?.colors || DEFAULT_PALETTE.colors;
    element.style = {...element.style,accent:colors.primary,secondary:colors.secondary,background:colors.background};
    if (project.canvas.width === 1080) {
      element.style.width = Math.min(element.style.width, 960);
      if (isBar(element)) { element.style = { ...element.style, x:0, y:project.canvas.height-PORTRAIT_BAR_HEIGHT, width:1080, scaleX:1, scaleY:1 }; }
      else {
        element.style.x = 60;
        element.style.y = kind === 'credit' ? 1740 : kind === 'freeText' ? 1530 : kind === 'slide' ? 1190 : kind === 'corner' ? 70 : 1450;
      }
    }
    applyChange({ ...project, elements: [...project.elements, element] });
    selectedId = element.id;
    time = Math.min(1.65, project.canvas.duration / 2);
    notify(`${element.title} adicionado ao projeto.`, 'success');
  }

  function updateSelectedField(key: TextField, value: string): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, fields: { ...element.fields, [key]: value } }));
  }

  /** Aplicado pelo editor de texto sobre a prévia, preservando o painel de propriedades. */
  const COLOR_KEYS: TextColorKey[] = ['heading','line1','line2','line3','line4','line5','line6',
    'caption0','caption1','caption2','caption3','caption4','caption5','footer'];

  function changeSelectedTextColor(key: TextColorKey, role: TextColorRole): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({...element,textColors:{...(element.textColors || {}),[key]:role}}));
  }

  function changeSelectedTextGroup(group: TextColorGroup, role: TextColorRole): void {
    if (!selectedId) return;
    changeElement(selectedId, element => withTextGroupColor(element, group, role));
  }

  function changeProjectTextGroup(group: TextColorGroup, role: TextColorRole): void {
    applyChange({ ...project, elements: project.elements.map(element => withTextGroupColor(element, group, role)) });
    notify('Cor de ' + (group === 'title' ? 'títulos' : group === 'body' ? 'corpos' : 'textos secundários') + ' aplicada a todo o projeto.', 'success');
  }

  function textRolesForAll(role: TextColorRole): Record<TextColorKey,TextColorRole> {
    return Object.fromEntries(COLOR_KEYS.map(key=>[key,role])) as Record<TextColorKey,TextColorRole>;
  }

  function changeAllSelectedTextColor(role: TextColorRole): void {
    if (!selectedId) return;
    changeElement(selectedId, element=>({...element,textColors:textRolesForAll(role),textGroups:{}}));
  }

  function changeAllProjectTextColor(role: TextColorRole): void {
    applyChange({...project,elements:project.elements.map(element=>({...element,textColors:textRolesForAll(role),textGroups:{}}))});
    notify('Cores dos textos atualizadas em todos os elementos.', 'success');
  }

  function applyPalette(preset: PaletteId, colors: PaletteColors): void {
    applyChange({
      ...project,
      palette:{preset,colors:{...colors}},
      elements:project.elements.map(element=>({...element,style:{...element.style,
        accent:colors.primary,secondary:colors.secondary,background:colors.background}})),
    });
  }

  function changeProjectPalettePreset(id: PaletteId): void {
    if(id==='custom') { applyPalette('custom',project.palette?.colors || DEFAULT_PALETTE.colors);return; }
    const p = PALETTE_PRESETS.find(x=>x.id===id);
    if (p) applyPalette(p.id,p.colors);
  }

  function changeProjectPaletteColor(key: keyof PaletteColors, raw: string): void {
    const value=parseColor(raw);
    if (!value) { notify('Cor inválida. Use #RRGGBB ou rgb(R,G,B).','error');return; }
    const colors = {...(project.palette?.colors || DEFAULT_PALETTE.colors),[key]:value};
    applyPalette('custom',colors);
  }

  function editTextDirect(id: string, field: TextField, value: string): void {
    changeElement(id, element => ({ ...element, fields: {
      ...element.fields, [field]: value.slice(0, element.kind === 'freeText' && field === 'line1' ? 6000 : 500),
    } }));
  }

  function editCaptionDirect(id: string, index: number, value: string): void {
    if (index < 0 || index > 5) return;
    changeElement(id, element => {
      const key = element.kind === 'technical' ? 'technicalCaptions' : element.kind === 'freeText' ? 'freeTextCaptions' : null;
      if (!key) return element;
      const defaultCaptions = ['CARROCERIA','MODELO','CHASSI','MODELO','EMPRESA','PREFIXO'];
      const captions = [...(element[key] || defaultCaptions)];
      captions[index] = value.slice(0,80);
      return { ...element, [key]: captions };
    });
  }

  function editTextFormatting(id: string, key: EditableTextKey, patch: Partial<TextFormatting>): void {
    changeElement(id, element => {
      const format = element.textFormatting || {};
      const sanitized = {...patch, ...(typeof patch.size === 'number' ? {size: clamp(Math.round(patch.size),9,180)} : {}), ...(typeof patch.family === 'string' ? {family:normalizeFontName(patch.family)} : {})};
      return { ...element, textFormatting: {...format, [key]: {...(format[key] || {}), ...sanitized}} };
    });
  }

  function updateSelectedFontFamily(font: string): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, style: {...element.style, fontFamily: normalizeFontName(font)} }));
  }

  function editParagraphDirect(id: string, field: TextField, type: 'alignment' | 'bullets', value: TextAlign | BulletMode): void {
    if (field !== 'line1') return;
    changeElement(id, element => element.kind === 'freeText'
      ? { ...element, richText: {...DEFAULT_RICH_TEXT,...element.richText, [type]: value} }
      : element);
  }

  function updateSelectedStyle(key: keyof HudStyle, value: number | string): void {
    if (!selectedId) return;
    const bottomBar = selected ? isBottomBar(selected,project.canvas.width,project.canvas.height) : false;
    const fullscreen = selected && ((selected.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(selected.technicalLayout || '')) || (selected.kind === 'freeText' && (selected.freeTextStyle === 'fullPage' || selected.freeTextStyle === 'fullTechnical' || selected.freeTextStyle === 'legacyPresentationSlide')));
    const limits: Partial<Record<keyof HudStyle, [number, number]>> = {
      x: [0, project.canvas.width], y: [0, project.canvas.height], width: [isBar(selected!) ? 640 : 140, project.canvas.width], fontSize: [16, 110], opacity: [0, 100], scaleX: [0.2, 4], scaleY: [0.2, 4],
    };
    const limit = limits[key];
    const adjusted = limit ? clamp(Number(value), bottomBar && key === 'scaleY' ? .75 : limit[0], bottomBar && key === 'scaleY' ? 1.4 : limit[1]) : value;
    changeElement(selectedId, element => {
      const nextStyle = { ...element.style, [key]: adjusted };
      if (fullscreen) { nextStyle.x=0;nextStyle.y=0;nextStyle.width=project.canvas.width;nextStyle.scaleX=1;nextStyle.scaleY=1; }
      else if (bottomBar) {
        nextStyle.x = 0; nextStyle.width = project.canvas.width; nextStyle.scaleX = 1;
        nextStyle.y = Math.round(project.canvas.height - PORTRAIT_BAR_HEIGHT*nextStyle.scaleY);
      } else if (isBar(element)) {
        if (key === 'width' || key === 'x' || key === 'scaleX') nextStyle.x = element.technicalSide === 'right' ? Math.max(0, project.canvas.width - nextStyle.width * nextStyle.scaleX) : 0;
        nextStyle.y = 0;
      }
      return { ...element, style: nextStyle };
    });
  }

  function resizeElement(id: string, change: Partial<HudStyle>): void {
    changeElement(id, element => ((element.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && (element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'fullTechnical' || element.freeTextStyle === 'legacyPresentationSlide'))) ? element : isBottomBar(element,project.canvas.width,project.canvas.height) ? ({ ...element, style: {...element.style, scaleY:clamp(change.scaleY ?? element.style.scaleY,.75,1.4), scaleX:1, width:project.canvas.width, x:0, y:Math.round(project.canvas.height - PORTRAIT_BAR_HEIGHT*clamp(change.scaleY ?? element.style.scaleY,.75,1.4))} })
      : ({ ...element, style: { ...element.style, ...change } }));
  }

  function resetSelectedScale(): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, style: {
      ...element.style, scaleX: 1, scaleY: 1,
      ...(isBottomBar(element,project.canvas.width,project.canvas.height) ? {x:0,y:project.canvas.height-PORTRAIT_BAR_HEIGHT,width:project.canvas.width} : isBar(element) ? { x: element.technicalSide === 'right' ? project.canvas.width - element.style.width : 0, y: 0 } : {}),
    } }));
  }

  function changeFreeTextStyle(value: FreeTextStyle): void {
    if (!selectedId) return;
    changeElement(selectedId, element => {
      if (element.kind !== 'freeText') return element;
      const full = value === 'fullTechnical' || value === 'fullPage' || value === 'legacyPresentationSlide';
      const width = full ? project.canvas.width : value === 'technicalBar' ? 640 : value === 'technicalAlpha1' ? 500 : value === 'legacyLabel' ? 550 : value === 'legacyHalfBar' ? Math.round(project.canvas.width*.47) : value === 'legacyFullBar' ? Math.round(project.canvas.width*.91) : value === 'legacyPresentationBar' ? Math.round(project.canvas.width*.91) : 900;
      const x = full ? 0 : value === 'technicalBar' ? (element.technicalSide === 'right' ? project.canvas.width - width : 0)
        : value === 'technicalAlpha1' ? Math.max(0, project.canvas.width - width - 70) : Math.min(element.style.x, project.canvas.width - width);
      const y = full || value === 'technicalBar' ? 0 : value === 'technicalAlpha1' ? Math.min(192, project.canvas.height - 480)
        : Math.max(0, Math.min(element.style.y, project.canvas.height - (value === 'legacyPresentationBar'?222: value.startsWith('legacy')?128:165)));
      const bottom = value === 'technicalBar' && project.canvas.height > project.canvas.width;
      return { ...element, freeTextStyle: value, ...(value.startsWith('legacy') ? { animation:'legacy' as const, visualPreset:'legacy' as const } : {}), style: { ...element.style, x:bottom?0:x, y:bottom?project.canvas.height-PORTRAIT_BAR_HEIGHT:y, width:bottom?project.canvas.width:width, scaleX: 1, scaleY: 1 } };
    });
  }

  function updateTechnicalLayout(layout: TechnicalLayout): void {
    if (!selectedId) return;
    changeElement(selectedId, element => {
      if (element.kind !== 'technical') return element;
      const width = ['fullscreen','legacyFullscreen'].includes(layout) ? project.canvas.width : Math.min(640, project.canvas.width);
      const bottom = layout === 'side' && project.canvas.height > project.canvas.width;
      return { ...element, technicalLayout: layout, ...(layout === 'legacyFullscreen' ? { animation:'legacy' as const, visualPreset:'legacy' as const } : {}),
        style: { ...element.style, width:bottom?project.canvas.width:width, scaleX:1, scaleY:1, x: bottom || ['fullscreen','legacyFullscreen'].includes(layout) ? 0 : element.technicalSide==='right' ? project.canvas.width-width : 0, y:bottom?project.canvas.height-PORTRAIT_BAR_HEIGHT:0 } };
    });
  }

  function updateRichText(key: keyof RichTextSettings, value: number | string | boolean): void {
    if (!selectedId) return;
    changeElement(selectedId, element => element.kind === 'freeText'
      ? { ...element, richText: { ...DEFAULT_RICH_TEXT, ...(element.richText||{}), [key]: value } }
      : element);
  }

  function fitSelectedScrollDuration(): void {
    if (!selected || selected.kind !== 'freeText') return;
    const r = { ...DEFAULT_RICH_TEXT, ...(selected.richText || {}) };
    if (!r.scrollLine1 && !r.scrollLine2) {
      notify('Ative a rolagem em pelo menos uma linha.', 'info');
      return;
    }
    const ctx = document.createElement('canvas').getContext('2d');
    const size = selected.style.fontSize * Math.sqrt(selected.style.scaleX * selected.style.scaleY);
    const w = selected.style.width * selected.style.scaleX - 64;
    const widthOf = (value:string, fontSize:number) => {
      if (!ctx) return value.length*fontSize*.62;
      ctx.font = `800 ${fontSize}px ${fontStack(selected.style.fontFamily)}`;
      return ctx.measureText(value).width;
    };
    const needed = [
      ...(r.scrollLine1 ? [legacyScrollRecommendedDuration(w,widthOf(selected.fields.line1,size),r.scrollPixelsPerSecond,r.scrollRepeats,r.scrollGap)] : []),
      ...(r.scrollLine2 && selected.fields.line2 ? [legacyScrollRecommendedDuration(w,widthOf(selected.fields.line2,size*.68),r.scrollPixelsPerSecond,r.scrollRepeats,r.scrollGap)] : []),
    ];
    if (!needed.length) return;
    const seconds = Math.ceil(Math.max(...needed) * 10) / 10;
    applyChange({ ...project, canvas: { ...project.canvas, duration: Math.min(30, seconds) } });
    notify(seconds > 30 ? `Rolagem requer aproximadamente ${seconds.toFixed(1)} s. Esta alpha limita a duração a 30 s.`
      : `Duração ajustada para ${seconds.toFixed(1)} s, incluindo entrada e saída.`, seconds > 30 ? 'info' : 'success');
  }

  function updateFreeTextCaption(index: number, value: string): void {
    if (!selectedId || index < 0 || index >= 6) return;
    changeElement(selectedId, element => {
      if (element.kind !== 'freeText') return element;
      const next = [...(element.freeTextCaptions || ['CARROCERIA','MODELO','CHASSI','MODELO','EMPRESA','PREFIXO'])];
      next[index] = value.slice(0,80);
      return { ...element, freeTextCaptions: next };
    });
  }

  function updateSelectedVisualPreset(value: 'legacy' | 'studio'): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({
      ...element,
      visualPreset: value,
      ...(value === 'legacy' && element.kind === 'freeText' && element.freeTextStyle === 'classic'
        ? { freeTextStyle: 'legacyLabel' as const }
        : value === 'legacy' && element.kind === 'freeText' && element.freeTextStyle === 'fullPage'
          ? { freeTextStyle: 'legacyPresentationSlide' as const, style: {...element.style, width:project.canvas.width, x:0, y:0, scaleX:1, scaleY:1} }
          : {}),
      animation: value === 'legacy' ? 'legacy' : element.animation === 'legacy' ? 'slide' : element.animation,
    }));
  }

  function updateSelectedAnimation(value: HudElement['animation']): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, animation: value }));
  }

  function updateSelectedTitle(title: string): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, title }));
  }

  function updateSelectedImage(imageData: string | undefined): void {
    if (!selectedId) return;
    changeElement(selectedId, element => {
      const next = { ...element };
      if (imageData) next.imageData = imageData;
      else delete next.imageData;
      return next;
    });
  }

  function toggleVisible(id: string): void {
    changeElement(id, element => ({ ...element, visible: !element.visible }));
  }

  function moveElement(id: string, x: number, y: number): void {
    changeElement(id, element => isBottomBar(element,project.canvas.width,project.canvas.height)
      ? {...element, style:{...element.style,x:0,y:Math.round(project.canvas.height-PORTRAIT_BAR_HEIGHT*element.style.scaleY),width:project.canvas.width,scaleX:1}} : isBar(element) || (element.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && (element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'fullTechnical' || element.freeTextStyle === 'legacyPresentationSlide'))
      ? { ...element, style: { ...element.style, x: (['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '') || (element.kind === 'freeText' && (element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'fullTechnical' || element.freeTextStyle === 'legacyPresentationSlide'))) ? 0 : element.technicalSide === 'right' ? project.canvas.width - element.style.width*element.style.scaleX : 0, y: 0 } }
      : { ...element, style: { ...element.style, x, y } });
  }

  function duplicateSelected(): void {
    if (!selected) return;
    if (project.elements.length >= MAX_ELEMENTS) return notify(`Limite de ${MAX_ELEMENTS} elementos atingido.`, 'error');
    const copy = duplicateElement(selected);
    applyChange({ ...project, elements: [...project.elements, copy] });
    selectedId = copy.id;
    notify('Elemento duplicado.', 'success');
  }

  function deleteSelected(): void {
    if (!selectedId) return;
    const removedId = selectedId;
    applyChange({ ...project, elements: project.elements.filter(element => element.id !== removedId) });
    selectedId = project.elements.at(-1)?.id ?? null;
    notify('Elemento excluído.', 'success');
  }

  function updateTechnicalSide(side: 'left' | 'right'): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({
      ...element,
      technicalSide: side,
      style: { ...element.style, x: isBottomBar(element,project.canvas.width,project.canvas.height) ? 0 : side === 'left' ? 0 : Math.max(0, project.canvas.width - element.style.width * element.style.scaleX), y: isBottomBar(element,project.canvas.width,project.canvas.height) ? project.canvas.height-PORTRAIT_BAR_HEIGHT*element.style.scaleY : 0 },
    }));
  }

  function changeCanvas(key: 'fps' | 'duration' | 'orientation', value: number | string): void {
    if (key === 'orientation') {
      const portrait = value === 'portrait';
      const width = portrait ? 1080 : 1920;
      const height = portrait ? 1920 : 1080;
      if (width === project.canvas.width) return;
      const ratioX = width / project.canvas.width;
      const ratioY = height / project.canvas.height;
      const elements = project.elements.map(element => {
        const full = (element.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && (element.freeTextStyle === 'fullTechnical' || element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'legacyPresentationSlide'));
        if (full) return {...element, style:{...element.style,x:0,y:0,width,scaleX:1,scaleY:1}};
        if (isBar(element)) {
          if (portrait) return {...element, style:{...element.style,x:0,y:height-PORTRAIT_BAR_HEIGHT,width,scaleX:1,scaleY:1}};
          const sideWidth = 640;
          return {...element, style:{...element.style,x:element.technicalSide==='right'?width-sideWidth:0,y:0,width:sideWidth,scaleX:1,scaleY:1}};
        }
        return {...element,style:{...element.style,
          x:Math.round(element.style.x*ratioX),y:Math.round(element.style.y*ratioY),
          width:Math.max(140,Math.min(width,Math.round(element.style.width*ratioX)))}};
      });
      applyChange({ ...project, canvas: { ...project.canvas, width, height }, elements });
      return;
    }
    const numericValue = Number(value);
    const adjusted = key === 'fps' ? (numericValue === 30 ? 30 : 60) : Math.round(clamp(numericValue, 1, 30) * 10) / 10;
    applyChange({ ...project, canvas: { ...project.canvas, [key]: adjusted } });
    time = clamp(time, 0, project.canvas.duration);
  }

  function animationFrame(timestamp: number): void {
    if (!playing) return;
    const delta = lastFrame === null ? 0 : Math.min((timestamp - lastFrame) / 1000, 0.1);
    lastFrame = timestamp;
    time = time + delta >= project.canvas.duration ? 0 : time + delta;
    frameHandle = requestAnimationFrame(animationFrame);
  }

  function stopPlayback(): void {
    playing = false;
    lastFrame = null;
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }

  function togglePlayback(): void {
    if (playing) { stopPlayback(); return; }
    if (time >= project.canvas.duration) time = 0;
    playing = true;
    lastFrame = null;
    frameHandle = requestAnimationFrame(animationFrame);
  }

  function seek(value: number): void {
    time = clamp(value, 0, project.canvas.duration);
    lastFrame = null;
  }

  function stopAndRewind(): void { stopPlayback(); time = 0; }

  function resetProject(): void {
    if (!confirm('Criar um novo projeto? O projeto atual permanece no último arquivo salvo, caso exista.')) return;
    stopPlayback();
    project = newProject();
    selectedId = project.elements[0]?.id || null;
    time = 1.65;
    notify('Novo projeto criado.', 'success');
  }

  async function saveCurrentProject(): Promise<void> {
    try {
      if (await saveProject(project)) {
        if (isDesktop()) outputDirectory = await getOutputDirectory();
        notify(isDesktop() ? 'Projeto salvo no arquivo selecionado.' : 'Download do projeto iniciado.', 'success');
      }
    } catch (error) {
      notify(`Não foi possível salvar: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  function installProject(loaded: RDVProject): void {
    stopPlayback();
    project = loaded;
    selectedId = loaded.elements[0]?.id || null;
    time = Math.min(1.65, loaded.canvas.duration / 2);
    notify('Projeto carregado com sucesso.', 'success');
  }

  async function openCurrentProject(): Promise<void> {
    try {
      if (isDesktop()) {
        const loaded = await openProjectNative();
        if (loaded) installProject(loaded);
      } else fileInput.click();
    } catch (error) {
      notify(`Erro ao abrir: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  async function fileChosen(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try { installProject(await openProjectBrowser(file)); }
    catch (error) { notify(`Projeto inválido: ${error instanceof Error ? error.message : String(error)}`, 'error'); }
  }

  async function openOutputFolder(): Promise<void> {
    try {
      const dir = await openOutputDirectory();
      outputDirectory = dir;
      notify(`Pasta de saída aberta: ${dir}`, 'success');
    } catch (error) {
      notify(`Erro ao abrir pasta de saída: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  function openVideoDialog(): void {
    showExportVideo = true;
    if (!isDesktop()) notify('Para gerar vídeo, abra o RDV Bus no aplicativo desktop Tauri.', 'info');
  }

  async function exportVideo(): Promise<void> {
    if (exportingVideo) return;
    if (!isDesktop()) return notify('Exportação de vídeo disponível somente no aplicativo desktop Tauri. Use npm run desktop:dev.', 'error');
    const preset = VIDEO_FORMATS.find(item => item.value === videoFormat) ?? VIDEO_FORMATS[0];
    const cleanName = project.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'rdv_bus';
    try {
      const output = await nativeSave({ title: 'Exportar vídeo RDV Bus', defaultPath: joinOutputPath(await getOutputDirectory(), `${cleanName}.${preset.ext}`), filters: [{ name: preset.label, extensions: [preset.ext] }] });
      if (!output) return;
      stopPlayback();
      exportingVideo = true;
      cancelRequested = false;
      exportProgress = 0;
      selectedVideoName = output;
      await tick();
      const canvas = document.createElement('canvas');
      const frames = Math.round(project.canvas.duration * project.canvas.fps);
      const jobId = await beginVideo(output, project.canvas.width, project.canvas.height, project.canvas.fps, frames, videoFormat);
      try {
        for (let index = 0; index < frames; index++) {
          if (cancelRequested) throw new Error('Exportação cancelada.');
          exportTime = exportFrameTime(index, frames, project.canvas.duration);
          await tick();
          const svg = document.querySelector<SVGSVGElement>('.export-render-stage .scene-svg');
          if (!svg) throw new Error('Quadro SVG de exportação não encontrado.');
          // O SVG declara tamanho intrínseco ampliado, preservando o viewBox original.
          // Assim o WebView realmente rasteriza os vetores a 2×, em vez de esticar
          // um bitmap já rasterizado a 1080p.
          const xml = exportFrameSvg(svg, project.canvas.width * rasterQuality, project.canvas.height * rasterQuality);
          const data = await svgToPngBase64(xml, project.canvas.width, project.canvas.height, canvas, rasterQuality, exportBackground);
          await pushVideoFrame(jobId, data);
          exportProgress = (index + 1) / frames;
          // Libera o loop de eventos periodicamente para atualizar o painel de progresso.
          if (index % 8 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        await finishVideo(jobId);
        showExportVideo = false;
        outputDirectory = rememberOutputFile(output);
        notify(`Vídeo exportado: ${output}`, 'success');
      } catch (error) {
        try { await cancelVideo(jobId); } catch { /* O processo pode ter encerrado. */ }
        throw error;
      }
    } catch (error) {
      notify(`Falha ao gerar vídeo: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      exportingVideo = false;
      cancelRequested = false;
      selectedVideoName = '';
    }
  }

  async function exportSvg(): Promise<void> {
    try {
      const svg = document.querySelector<SVGSVGElement>('.scene-svg');
      if (!svg) throw new Error('A pré-visualização não está disponível.');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${exportFrameSvg(svg, project.canvas.width, project.canvas.height)}`;
      const name = `${project.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'rdv-bus'}_quadro.svg`;
      if (isTauri()) {
        const path = await nativeSave({ title: 'Exportar quadro SVG', defaultPath: joinOutputPath(await getOutputDirectory(), name), filters: [{ name: 'Imagem SVG', extensions: ['svg'] }] });
        if (!path) return;
        await writeTextFile(path, xml);
        outputDirectory = rememberOutputFile(path);
        notify(`Quadro SVG exportado: ${path}`, 'success');
      } else {
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        notify('Download do quadro SVG iniciado.', 'success');
      }
    } catch (error) {
      notify(`Falha ao exportar SVG: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    const element = event.target as HTMLElement;
    const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName) || element?.isContentEditable;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveCurrentProject(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); void openCurrentProject(); }
    else if (!editing && (event.key === 'Delete' || event.key === 'Backspace') && selectedId) { event.preventDefault(); deleteSelected(); }
    else if (!editing && event.code === 'Space' && !event.repeat) { event.preventDefault(); togglePlayback(); }
    else if (event.key === 'Escape') { showHelp = false; showSettings = false; }
  }

  onDestroy(() => {
    stopPlayback();
    if (statusTimer !== null) clearTimeout(statusTimer);
  });
</script>

<svelte:window on:keydown={handleKeydown}/>
<input class="visually-hidden" type="file" accept=".json,application/json" bind:this={fileInput} on:change={fileChosen}/>

<div class="app-shell">
  <header class="app-header">
    <div class="brand-zone">
      <div class="app-brand" title="RDV Bus Studio"><div class="brand-icon"><Icon name="bus" size={25} stroke={2}/></div><div class="brand-title">RDV <span>Bus</span><small>STUDIO</small></div></div>
      <div class="header-divider"></div>
      <div class="project-control"><span class="project-label">PROJETO ATUAL</span><div class="project-input-wrap"><Icon name="edit" size={14}/><input aria-label="Nome do projeto" value={project.name} maxlength="120" on:input={(event) => applyChange({ ...project, name: event.currentTarget.value })}/></div></div>
    </div>
    <div class="header-actions">
      <span class="autosave-mark" title={autosaveOk ? "O projeto está salvo localmente neste dispositivo" : "Armazenamento local indisponível: salve um arquivo JSON"}><span class:autosave-failed={!autosaveOk} class="autosave-dot"></span> {autosaveOk ? "Salvo localmente" : "Salve o projeto"}</span>
      <button class="button ghost-button" on:click={resetProject} title="Criar novo projeto"><Icon name="plus" size={16}/><span>Novo</span></button>
      <button class="button ghost-button" on:click={() => void openCurrentProject()} title="Abrir projeto (Ctrl+O)"><Icon name="folder" size={16}/><span>Abrir</span></button>
      <button class="button secondary-button" on:click={() => void saveCurrentProject()} title="Salvar projeto (Ctrl+S)"><Icon name="save" size={16}/><span>Salvar</span></button>
      {#if isDesktop()}<button class="button ghost-button" on:click={() => void openOutputFolder()} title={outputDirectory ? `Abrir pasta de saída: ${outputDirectory}` : 'Abrir pasta de saída'}><Icon name="folder" size={16}/><span>Abrir pasta de saída</span></button>{/if}
      <button class="button secondary-button" on:click={() => void exportSvg()} title="Exportar um quadro vetorial SVG"><Icon name="download" size={17}/><span>SVG</span></button>
      <button class="button primary-button" on:click={openVideoDialog} title="Gerar vídeo animado com FFmpeg (desktop)"><Icon name="film" size={17}/><span>Exportar vídeo</span></button>
    </div>
  </header>

  <div class="workspace">
    <nav class="app-rail" aria-label="Navegação principal">
      <button class:rail-active={showLibrary} class="rail-button" aria-label="Biblioteca de elementos" title="Biblioteca" on:click={() => showLibrary = !showLibrary}><Icon name="grid" size={21}/><small>Elementos</small></button>
      <button class="rail-button" aria-label="Propriedades do projeto" title="Projeto" on:click={() => { selectedId = null; showLibrary = true; }}><Icon name="layers" size={21}/><small>Projeto</small></button>
      <div class="rail-spacer"></div>
      <button class="rail-button" aria-label="Ajuda" on:click={() => showHelp = true} title="Ajuda"><Icon name="info" size={21}/><small>Ajuda</small></button>
      <button class="rail-button" aria-label="Configurações" on:click={() => { selectedId = null; showSettings = true; }} title="Configurações"><Icon name="settings" size={21}/><small>Config.</small></button>
    </nav>

    {#if showLibrary}
      <aside class="library-panel"><LibraryPanel {project} {selectedId} onAdd={addElement} onSelect={(id) => selectedId = id} onToggleVisible={toggleVisible}/></aside>
    {/if}

    <main class="editor-main">
      <div class="canvas-toolbar">
        <div class="canvas-title"><Icon name="layout" size={17}/><strong>Editor de cena</strong><span class="breadcrumb-separator">/</span><span>Composição principal</span></div>
        <div class="canvas-toolbar-right"><button class="canvas-chip preview-toggle" class:preview-toggle-active={previewBackground === 'black'} aria-pressed={previewBackground === 'black'} title="Alternar fundo preto e transparência quadriculada" on:click={() => previewBackground = previewBackground === 'black' ? 'checker' : 'black'}><Icon name="layers" size={13}/> {previewBackground === 'black' ? 'Fundo preto' : 'Quadriculado'}</button><span class="canvas-chip"><span class="chip-dot"></span>Pré-visualização SVG</span><span class="canvas-chip resolution-chip">{project.canvas.width} × {project.canvas.height}</span></div>
      </div>
      <div class="canvas-main-area">
        <div class="canvas-stack">
          <div class="canvas-top-caption"><span><Icon name="maximize" size={15}/> Monitor de pré-visualização</span><span>{project.canvas.width === 1080 ? '9:16' : '16:9'} · SVG com transparência</span></div>
          <div class="canvas-bezel">
            <div class="stage-checker" class:stage-black={previewBackground === 'black'} class:portrait-stage={project.canvas.width === 1080} style={`aspect-ratio: ${project.canvas.width} / ${project.canvas.height}`}><ScenePreview {project} {selectedId} {time} onSelect={(id) => selectedId = id} onMove={moveElement} onResize={resizeElement}
              onBeginEdit={stopPlayback} onEditField={editTextDirect} onEditCaption={editCaptionDirect}
              onTextFormat={editTextFormatting} onParagraphFormat={editParagraphDirect} {systemFonts}/>
</div>
          </div>
          <div class="canvas-bottom-bar"><span><span class="live-indicator"></span> Cena editável</span><span>Clique no texto para editar · arraste o painel para mover · alças para redimensionar</span><span>{project.elements.filter(e => e.visible).length} visíveis de {project.elements.length}</span></div>
        </div>
      </div>
      <div class="timeline-panel"><Timeline {project} {selectedId} {time} {playing} onTogglePlay={togglePlayback} onStop={stopAndRewind} onSeek={seek} onSelect={(id) => selectedId = id}/></div>
    </main>

    <aside class="inspector-panel"><PropertiesPanel {project} {selected} onField={updateSelectedField} onStyle={updateSelectedStyle} onTextColor={changeSelectedTextColor} onTextGroup={changeSelectedTextGroup} onProjectTextGroup={changeProjectTextGroup} onAllSelectedText={changeAllSelectedTextColor} onAllProjectText={changeAllProjectTextColor} onPalettePreset={changeProjectPalettePreset} onPaletteColor={changeProjectPaletteColor} onAnimation={updateSelectedAnimation} onRename={updateSelectedTitle} onDuplicate={duplicateSelected} onDelete={deleteSelected} onImage={updateSelectedImage} onCanvas={changeCanvas} onTechnicalSide={updateTechnicalSide} onTechnicalLayout={updateTechnicalLayout}
      {systemFonts} onFontFamily={updateSelectedFontFamily} onVisualPreset={updateSelectedVisualPreset} onFitScrollDuration={fitSelectedScrollDuration} onRichText={updateRichText} onFreeTextStyle={changeFreeTextStyle} onFreeTextCaption={updateFreeTextCaption} onResetScale={resetSelectedScale} onSelectNone={() => selectedId = null}/></aside>
  </div>

  <footer class="app-footer"><div><span class="footer-dot"></span> RDV Bus Studio <span class="footer-divider">·</span> <span class="muted">{APP_VERSION}</span></div><div><span class="footer-stat">{project.elements.length} elemento(s)</span><span class="footer-divider">·</span><span class="footer-stat">{totalFrames} quadros</span><span class="footer-divider">·</span><span class="muted">{isDesktop() ? 'Tauri Desktop' : 'Modo navegador'}</span></div></footer>
</div>

{#if exportingVideo}
  <div class="export-render-stage" aria-hidden="true" style={`width:${project.canvas.width}px;height:${project.canvas.height}px`}>
    <ScenePreview {project} selectedId={null} time={exportTime} onSelect={() => {}} onMove={() => {}} />
  </div>
{/if}

{#if showExportVideo}
  <div class="dialog-backdrop" role="presentation">
    <div class="help-dialog" role="dialog" aria-modal="true" aria-label="Exportar vídeo animado">
      <div class="dialog-heading"><div><Icon name="film"/><strong>Exportar vídeo com transparência</strong></div><button class="icon-button" aria-label="Fechar" disabled={exportingVideo} on:click={() => showExportVideo = false}>×</button></div>
      <div class="dialog-content video-export-content">
        <p>Gera {totalFrames} quadros a {project.canvas.fps} FPS em {project.canvas.width} × {project.canvas.height}. O fundo continua transparente; o preto é somente da pré-visualização.</p>
        {#if isDesktop()}<p class="export-description">Pasta de saída: <code>{outputDirectory || '~/RDV Bus Studio'}</code> <button class="button ghost-button" on:click={() => void openOutputFolder()} disabled={exportingVideo}><Icon name="folder" size={15}/> Abrir pasta</button></p>{/if}
        <label for="video-format">Formato de vídeo</label>
        <select id="video-format" bind:value={videoFormat} disabled={exportingVideo}>
          {#each VIDEO_FORMATS as preset}<option value={preset.value}>{preset.label}</option>{/each}
        </select>
        <p class="export-description">{VIDEO_FORMATS.find(item => item.value === videoFormat)?.description}</p>
        <label for="raster-quality">Qualidade de bordas (SVG → PNG)</label>
        <select id="raster-quality" bind:value={rasterQuality} disabled={exportingVideo}>
          <option value={1}>Normal — 1× (mais rápido)</option>
          <option value={2}>Alta — 2× supersampling (recomendado)</option>
        </select>
        <p class="export-description">2× renderiza os vetores em resolução ampliada antes de reduzir para 1080p. Melhora diagonais e contornos, mas aumenta o trabalho de renderização.</p>
        <label for="export-background">Fundo do vídeo</label>
        <select id="export-background" bind:value={exportBackground} disabled={exportingVideo}>
          <option value="transparent">Transparente — sobreposição no editor de vídeo</option>
          <option value="black">Preto — demonstração compatível com qualquer player</option>
        </select>
        {#if exportBackground === 'black'}
          <p class="video-warning">O fundo preto torna as transições de opacidade visíveis até em players que ignoram o canal alfa, mas NÃO permite sobrepor o vídeo a outra filmagem.</p>
        {/if}
        {#if videoFormat === 'webm-vp9' && exportBackground === 'transparent'}
          <p class="video-warning">O WebM/VP9 usa alfa separado: alguns players exibem as cores sem aplicar a opacidade. Para qualidade máxima e transparência em editores compatíveis, compare com MOV QuickTime Animation (QTRLE) ou ProRes 4444.</p>
        {/if}
        {#if !isDesktop()}
          <p class="video-warning">A exportação de vídeo funciona no aplicativo Tauri. No navegador, use o botão SVG; para vídeo, execute <code>npm run desktop:dev</code> com FFmpeg instalado.</p>
        {/if}
        {#if exportingVideo}
          <label for="export-progress">Gerando vídeo: {Math.round(exportProgress * 100)}%</label>
          <progress id="export-progress" value={exportProgress} max="1" style="width:100%"></progress>
          <p class="export-description">{selectedVideoName}</p>
        {/if}
      </div>
      <div class="dialog-actions">
        {#if exportingVideo}
          <button class="button secondary-button" on:click={() => cancelRequested = true} disabled={cancelRequested}>Cancelar geração</button>
        {:else}
          <button class="button ghost-button" on:click={() => showExportVideo = false}>Voltar</button>
          <button class="button primary-button" on:click={() => void exportVideo()} disabled={!isDesktop()}><Icon name="film" size={16}/> Gerar vídeo</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if status}
  <div class:toast-error={status.kind === 'error'} class="toast" role="status"><Icon name={status.kind === 'error' ? 'alert-circle' : status.kind === 'success' ? 'check' : 'info'} size={18}/><span>{status.text}</span><button aria-label="Fechar aviso" on:click={() => status = null}>×</button></div>
{/if}

{#if showHelp}
  <div class="dialog-backdrop" role="presentation">
    <div class="help-dialog" role="dialog" aria-modal="true" aria-label="Ajuda do RDV Bus Studio">
      <div class="dialog-heading"><div><Icon name="sparkles"/><strong>Bem-vindo ao RDV Bus Studio</strong></div><button aria-label="Fechar ajuda" class="icon-button" on:click={() => showHelp = false}>×</button></div>
      <div class="dialog-content"><p>Esta é a reconstrução da identidade clássica na nova geração do RDV Bus. Clique nos textos para editar diretamente e usar a barra flutuante. Arraste os painéis para mover elementos e visualize as animações na linha do tempo.</p>
      <div class="help-grid"><div><strong>Adicionar</strong><span>Escolha um modelo na biblioteca da esquerda.</span></div><div><strong>Personalizar</strong><span>Selecione e arraste as alças para dimensionar; Shift mantém a proporção. Use o painel à direita para ajustes precisos.</span></div><div><strong>Reproduzir</strong><span>Use o botão Play ou a barra de espaço.</span></div><div><strong>Salvar</strong><span>Ctrl+S grava o projeto. Ctrl+O abre um projeto.</span></div><div><strong>Exportação</strong><span>SVG no navegador e desktop; vídeo com FFmpeg na versão Tauri.</span></div><div><strong>Excluir</strong><span>Use Delete fora dos campos de edição.</span></div></div>
      <p class="dialog-disclaimer">Exportação de vídeo experimental com FFmpeg já disponível no aplicativo Tauri. Renderização nativa resvg e exportação PNG ainda estão planejadas.</p></div>
      <button class="button primary-button dialog-close" on:click={() => showHelp = false}>Começar a editar</button>
    </div>
  </div>
{/if}

{#if showSettings}
  <div class="dialog-backdrop" role="presentation">
    <div class="help-dialog" role="dialog" aria-modal="true" aria-label="Configurações da versão inicial">
      <div class="dialog-heading"><div><Icon name="settings"/><strong>Configurações do projeto</strong></div><button aria-label="Fechar configurações" class="icon-button" on:click={() => showSettings = false}>×</button></div>
      <div class="dialog-content"><p>As configurações da composição ficam no painel de propriedades quando nenhum elemento está selecionado. Você pode usar os formatos horizontal e vertical.</p><div class="setting-summary"><span>Resolução</span><strong>{project.canvas.width} × {project.canvas.height}</strong><span>Quadros por segundo</span><strong>{project.canvas.fps} FPS</strong><span>Duração</span><strong>{project.canvas.duration.toFixed(1)} segundos</strong><span>Formato do projeto</span><strong>RDV JSON v1</strong></div></div>
      <button class="button primary-button dialog-close" on:click={() => showSettings = false}>Fechar</button>
    </div>
  </div>
{/if}
