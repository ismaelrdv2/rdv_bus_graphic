<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { invoke, isTauri } from '@tauri-apps/api/core';
  import { save as nativeSave } from '@tauri-apps/plugin-dialog';
  import { writeTextFile } from '@tauri-apps/plugin-fs';
  import { getOutputDirectory, joinOutputPath, openOutputDirectory, rememberOutputFile } from './lib/output';
  import Icon from './components/Icon.svelte';
  import Navigator from './components/Navigator.svelte';
  import UpdateCenter from './components/UpdateCenter.svelte';
  import LibraryPanel from './components/LibraryPanel.svelte';
  import PropertiesPanel from './components/PropertiesPanel.svelte';
  import ScenePreview from './components/ScenePreview.svelte';
  import Timeline from './components/Timeline.svelte';
  import { copyLocation, duplicateElement, makeElement, newProject } from './lib/templates';
  import { APP_VERSION } from './lib/types';
  import { clamp, exportFrameTime } from './lib/timing';
  import { isBar, isBottomBar, PORTRAIT_BAR_HEIGHT, isCompactCartela, standardizeCard, CREDIT_CARD_HEIGHT } from './lib/geometry';
  import { FALLBACK_FONTS, fontStack, normalizeFontName } from './lib/fonts';
  import { getSystemFontFamilies } from './lib/systemFonts';
  import { DEFAULT_RICH_TEXT } from './lib/richtext';
  import { DEFAULT_PALETTE, PALETTE_PRESETS, parseColor, withTextGroupColor } from './lib/palette';
  import type { EditableTextKey } from './lib/inlineText';
  import { legacyScrollRecommendedDuration } from './lib/legacy';
  import { canonicalFreeTextStyle, studioOnlyStyle, labelBarDimensions, estimatedLabelWidth, type LabelBarSize } from './lib/freeTextModes';
  import { beginVideo, pushVideoFrame, finishVideo, cancelVideo, exportFrameSvg, svgToPngBase64, VIDEO_FORMATS, type VideoFormat, type RasterQuality, type ExportBackground } from './lib/video';
  import { MAX_ELEMENTS, type TextFormatting, type TextAlign, type BulletMode, type ElementKind, type FreeTextStyle, type RichTextSettings, type TechnicalLayout, type HudElement, type HudStyle, type RDVProject, type TextField, type TextColorKey, type TextColorRole, type TextColorGroup, type PaletteColors, type PaletteId, type UiStatus } from './lib/types';
  import { isDesktop, loadAutosave, openProjectBrowser, openProjectNative, saveProject, writeAutosave } from './lib/projects';
  import { KDENLIVE_OVERLAY_PRESET, prepareKdenliveClip } from './lib/kdenlive';

  let showNavigator=false;
  async function saveNavigatorText(name:string,content:string,mime:string):Promise<void>{
    if(isTauri()){const path=await nativeSave({defaultPath:joinOutputPath(await getOutputDirectory(),name)});if(path)await writeTextFile(path,content);}
    else{const u=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);}
  }
  async function renderNavigator(width:number,height:number,duration:number,fps:30|60,render:(t:number)=>string,progress:(n:number,total:number)=>void,cancel:()=>boolean,mode:'alpha'|'green'|'blue'|'black'):Promise<string>{
    if(!isTauri())throw Error('Disponível no Desktop nativo.');
    const ext=mode==='alpha'?'mov':'mp4';const path=await nativeSave({defaultPath:joinOutputPath(await getOutputDirectory(),'RDV_Navigator.'+ext),filters:[{name:mode==='alpha'?'QuickTime Animation':'MP4 H.264',extensions:[ext]}]});
    if(!path)return 'Exportação cancelada.';
    const frames=Math.ceil(duration*fps);if(frames<1||frames>216000)throw Error('Duração de exportação inválida.');
    const canvas=document.createElement('canvas');let job:string|undefined;
    try{job=await beginVideo(path,width,height,fps,frames,mode==='alpha'?'mov-qtrle':'mp4-h264');for(let i=0;i<frames;i++){if(cancel())throw Error('Exportação cancelada.');const png=await svgToPngBase64(render(i/fps),width,height,canvas,1,mode==='alpha'?'transparent':mode);await pushVideoFrame(job,png);progress(i+1,frames);}if(cancel())throw Error('Exportação cancelada.');const result=await finishVideo(job);job=undefined;return result;}finally{if(job)await cancelVideo(job).catch(()=>{});}
  }
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
  let productionMode:'manual'|'wizard'='manual';
  let wizardIndex=0;
  let wizardCreditType:'film'|'photo'='film';
  let renderingProject:RDVProject=project;
  let batchCount=0,batchCurrent=0,batchLabel='';
  let videoFormat: VideoFormat = 'mov-qtrle';
  let rasterQuality: RasterQuality = 2;
  let exportBackground: ExportBackground = 'transparent';
  let prepareForKdenlive = false;
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
  $: activeDuration=selected?.productionDuration??project.canvas.duration;
  $: totalFrames = Math.round(activeDuration * project.canvas.fps);
  $: timelineProject={...project,canvas:{...project.canvas,duration:activeDuration}};
  $: editorPreviewProject=productionMode==='wizard'&&selected?
    {...timelineProject,elements:[{...selected,visible:true}]}:timelineProject;
  const WIZARD_STEPS:{kind:ElementKind;label:string}[]=[
    {kind:'technical',label:'Ficha técnica'},{kind:'route',label:'Linha'},
    {kind:'date',label:'Data'},{kind:'location',label:'Local'},
    {kind:'credit',label:'Crédito da filmagem / fotos'},
    {kind:'driver',label:'Motorista'},{kind:'freeText',label:'Texto livre'}
  ];

  function notify(text: string, kind: UiStatus['kind'] = 'info'): void {
    status = { kind, text };
    if (statusTimer !== null) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status = null; }, 4800);
  }

  function applyChange(next: RDVProject): void {
    project = { ...next, appVersion: APP_VERSION, updatedAt: new Date().toISOString() };
  }

  function changeElement(id: string, fn: (element: HudElement) => HudElement): void {
    applyChange({ ...project, elements: project.elements.map(element => {
      if(element.id!==id)return element;
      const next=fn(element);
      if(next.kind==='freeText' && next.freeTextStyle==='legacyLabel' && next.autoFitWidth){
        const width=estimatedLabelWidth(next,project.canvas.width);
        return {...next,style:{...next.style,width,scaleX:1,
          x:Math.max(0,Math.min(next.style.x,project.canvas.width-width))}};
      }
      return next;
    }) });
  }

  function addElement(kind: ElementKind): void {
    if (project.elements.length >= MAX_ELEMENTS) return notify(`Limite de ${MAX_ELEMENTS} elementos atingido.`, 'error');
    const previous=kind==='location'?project.elements.filter(el=>el.kind==='location').at(-1):undefined;
    if(previous){
      const element=copyLocation(previous);
      applyChange({...project,elements:[...project.elements,element]});
      selectedId=element.id;
      time=Math.min(1.65,(element.productionDuration??project.canvas.duration)/2);
      notify('Novo local criado a partir do anterior.', 'success');
      return;
    }
    const element = makeElement(kind);
    const colors = project.palette?.colors || DEFAULT_PALETTE.colors;
    element.style = {...element.style,accent:colors.primary,secondary:colors.secondary,background:colors.background};
    if (project.canvas.width === 1080) {
      element.style.width = Math.min(element.style.width, 960);
      if (isBar(element)) { element.style = { ...element.style, x:0, y:project.canvas.height-PORTRAIT_BAR_HEIGHT, width:1080, scaleX:1, scaleY:1 }; }
      else {
        element.style.x = 60;
        element.style.y = isCompactCartela(element) ? project.canvas.height - CREDIT_CARD_HEIGHT - 52 : kind === 'freeText' ? 1530 : kind === 'slide' ? 1190 : kind === 'corner' ? 70 : 1450;
      }
    }
    applyChange({ ...project, elements: [...project.elements, element] });
    selectedId = element.id;
    time = Math.min(1.65, project.canvas.duration / 2);
    notify(`${element.title} adicionado ao projeto.`, 'success');
  }

  function standardizeSelectedCard(): void {
    if (!selectedId || !selected || !isCompactCartela(selected)) return;
    changeElement(selectedId, element => standardizeCard(element, project.canvas.width, project.canvas.height));
    notify('Cartela ajustada para 550 × 102 px, mantendo os textos e cores.', 'success');
  }

  function standardizeAllCards(): void {
    const count = project.elements.filter(isCompactCartela).length;
    if (!count) return notify('Nenhuma cartela compacta para padronizar.', 'info');
    applyChange({...project, elements:project.elements.map(el => standardizeCard(el, project.canvas.width, project.canvas.height))});
    notify(`${count} cartela(s) padronizada(s) para 550 × 102 px.`, 'success');
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
    const fullscreen = selected && ((selected.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(selected.technicalLayout || '')) || (selected.kind === 'freeText' && (selected.freeTextStyle === 'fullPage' || selected.freeTextStyle === 'fullTechnical' || ['legacyPresentationSlide','newsSlide'].includes(selected.freeTextStyle || ''))));
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
      return { ...element, autoFitWidth: (key==='width'||key==='scaleX')?false:element.autoFitWidth, style: nextStyle };
    });
  }

  function resizeElement(id: string, change: Partial<HudStyle>): void {
    changeElement(id, element => ((element.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && (element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'fullTechnical' || ['legacyPresentationSlide','newsSlide'].includes(element.freeTextStyle || '')))) ? element : isBottomBar(element,project.canvas.width,project.canvas.height) ? ({ ...element, style: {...element.style, scaleY:clamp(change.scaleY ?? element.style.scaleY,.75,1.4), scaleX:1, width:project.canvas.width, x:0, y:Math.round(project.canvas.height - PORTRAIT_BAR_HEIGHT*clamp(change.scaleY ?? element.style.scaleY,.75,1.4))} })
      : ({ ...element, autoFitWidth: change.width!==undefined||change.scaleX!==undefined?false:element.autoFitWidth, style: { ...element.style, ...change } }));
  }

  function resetSelectedScale(): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, style: {
      ...element.style, scaleX: 1, scaleY: 1,
      ...(isBottomBar(element,project.canvas.width,project.canvas.height) ? {x:0,y:project.canvas.height-PORTRAIT_BAR_HEIGHT,width:project.canvas.width} : isBar(element) ? { x: element.technicalSide === 'right' ? project.canvas.width - element.style.width : 0, y: 0 } : {}),
    } }));
  }

  function changeFreeTextStyle(value: FreeTextStyle): void {
    value=canonicalFreeTextStyle(value);
    if (!selectedId) return;
    changeElement(selectedId, element => {
      if (element.kind !== 'freeText') return element;
      const full = ['fullTechnical','fullPage','legacyPresentationSlide','newsSlide'].includes(value);
      const width = full ? project.canvas.width : value === 'technicalBar' ? 640 : value === 'technicalAlpha1' ? 500 : ['legacyLabel','newsLabel'].includes(value) ? 550 : value === 'newsTicker' || value === 'newsLowerThird' ? Math.min(project.canvas.width-60,1260) : value === 'legacyHalfBar' ? Math.round(project.canvas.width*.47) : value === 'legacyFullBar' ? Math.round(project.canvas.width*.91) : value === 'legacyPresentationBar' ? Math.round(project.canvas.width*.91) : 900;
      const x = full ? 0 : value === 'technicalBar' ? (element.technicalSide === 'right' ? project.canvas.width - width : 0)
        : value === 'technicalAlpha1' ? Math.max(0, project.canvas.width - width - 70) : Math.min(element.style.x, project.canvas.width - width);
      const y = full || value === 'technicalBar' ? 0 : value === 'technicalAlpha1' ? Math.min(192, project.canvas.height - 480)
        : Math.max(0, Math.min(element.style.y, project.canvas.height - (value === 'legacyPresentationBar'?222: value === 'newsTicker'?138: value === 'newsLowerThird'?205: value === 'newsLabel'?102: value.startsWith('legacy')?128:165)));
      const bottom = value === 'technicalBar' && project.canvas.height > project.canvas.width;
      return { ...element, freeTextStyle: value, visualPreset:studioOnlyStyle(value)?'studio':element.visualPreset, ...(value.startsWith('legacy') ? { animation:'legacy' as const } : {}), style: { ...element.style, x:bottom?0:x, y:bottom?project.canvas.height-PORTRAIT_BAR_HEIGHT:y, width:bottom?project.canvas.width:width, scaleX: 1, scaleY: 1 } };
    });
  }

  function updateLabelBarSize(size:LabelBarSize):void{
    if(!selectedId)return;
    changeElement(selectedId,element=>{
      if(element.kind!=='freeText'||element.freeTextStyle!=='legacyLabel')return element;
      const dims=labelBarDimensions(size,project.canvas.width);
      return {...element,scrollBarSize:size,autoFitWidth:false,style:{
        ...element.style,width:dims.width,scaleX:1,scaleY:1,
        x:Math.max(0,Math.min(element.style.x,project.canvas.width-dims.width)),
        y:Math.max(0,Math.min(element.style.y,project.canvas.height-dims.height))
      }};
    });
  }

  function setLabelAutoFit(enabled:boolean):void{
    if(!selectedId)return;
    changeElement(selectedId,element=>element.kind==='freeText'&&element.freeTextStyle==='legacyLabel'
      ? {...element,autoFitWidth:enabled,scrollBarSize:'small'}:element);
  }

  function updateTechnicalLayout(layout: TechnicalLayout): void {
    if (!selectedId) return;
    changeElement(selectedId, element => {
      if (element.kind !== 'technical') return element;
      const width = ['fullscreen','legacyFullscreen'].includes(layout) ? project.canvas.width : Math.min(640, project.canvas.width);
      const bottom = layout === 'side' && project.canvas.height > project.canvas.width;
      return { ...element, technicalLayout: layout, ...(layout === 'legacyFullscreen' ? { animation:'legacy' as const } : {}),
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
    if(selectedId)changeElement(selectedId,element=>({...element,productionDuration:Math.min(60,seconds)}));
    else applyChange({ ...project, canvas: { ...project.canvas, duration: Math.min(30, seconds) } });
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

  function updateSelectedFreeTextDisplay(value: HudElement['freeTextDisplay']): void {
    if (!selectedId) return;
    changeElement(selectedId, element => element.kind === 'freeText' ? {...element, freeTextDisplay:value || 'both'} : element);
  }

  function updateSelectedFreeTextNote(enabled:boolean):void{
    if(!selectedId)return;
    changeElement(selectedId,element=>element.kind==='freeText'&&element.freeTextStyle==='fullPage'
      ? {...element,showFullPageNote:enabled}:element);
  }

  function updateSelectedFreeTextIcon(value: HudElement['freeTextIcon']): void {
    if (!selectedId) return;
    changeElement(selectedId, element => element.kind === 'freeText' ? {...element, freeTextIcon:value || 'none'} : element);
  }

  function updateSelectedVisualPreset(value: 'legacy' | 'studio'): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({
      ...element,
      visualPreset: element.kind==='freeText'&&studioOnlyStyle(element.freeTextStyle)?'studio':value,
      // Aparência, formato e animação são escolhas independentes.
      // Não troca a animação escolhida ao mudar Studio/Clássico.
    }));
  }

  function updateSelectedAnimation(value: HudElement['animation']): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, animation: value }));
  }
  function updateSelectedShine(value:boolean):void {
    if (!selectedId) return;
    changeElement(selectedId,element=>({...element,shineEnabled:value}));
  }
  function updateSelectedDiagonalGlow(value:boolean):void {
    if (!selectedId) return;
    changeElement(selectedId,element=>({...element,diagonalGlowEnabled:value}));
  }
  function updateSelectedDiagonalIntensity(value:number):void {
    if (!selectedId) return;
    changeElement(selectedId,element=>({...element,diagonalGlowIntensity:Math.max(50,Math.min(300,Math.round(value/10)*10))}));
  }

  function updateSelectedTitle(title: string): void {
    if (!selectedId) return;
    changeElement(selectedId, element => ({ ...element, title }));
  }

  function updateSelectedFooter(key: 'footerMode' | 'footerText' | 'footerImageData', value:string | undefined): void {
    if (!selectedId) return;
    changeElement(selectedId,element=>{
      const next={...element};
      if (key==='footerImageData' && !value) delete next.footerImageData;
      else if (key==='footerText') next.footerText=(value||'').slice(0,100);
      else if (key==='footerMode' && ['text','image','none'].includes(value||'')) next.footerMode=value as HudElement['footerMode'];
      else if (key==='footerImageData') next.footerImageData=value;
      return next;
    });
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
      ? {...element, style:{...element.style,x:0,y:Math.round(project.canvas.height-PORTRAIT_BAR_HEIGHT*element.style.scaleY),width:project.canvas.width,scaleX:1}} : isBar(element) || (element.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && (element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'fullTechnical' || ['legacyPresentationSlide','newsSlide'].includes(element.freeTextStyle || '')))
      ? { ...element, style: { ...element.style, x: (['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '') || (element.kind === 'freeText' && (element.freeTextStyle === 'fullPage' || element.freeTextStyle === 'fullTechnical' || ['legacyPresentationSlide','newsSlide'].includes(element.freeTextStyle || '')))) ? 0 : element.technicalSide === 'right' ? project.canvas.width - element.style.width*element.style.scaleX : 0, y: 0 } }
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
    if (!selectedId || exportingVideo) return;
    changeElement(selectedId, element => {
      const fullscreen=(element.kind==='technical' && ['fullscreen','legacyFullscreen'].includes(element.technicalLayout||'')) ||
        (element.kind==='freeText' && ['fullTechnical','fullPage','legacyPresentationSlide','newsSlide'].includes(element.freeTextStyle||''));
      const bottom=isBottomBar(element,project.canvas.width,project.canvas.height);
      const bar=isBar(element);
      const available=Math.max(0,project.canvas.width-element.style.width*element.style.scaleX);
      const inset=bar?0:Math.min(56,available/4);
      return {
        ...element,technicalSide:side,
        style:{...element.style,
          x: fullscreen||bottom?0:side==='left'?inset:Math.max(0,available-inset),
          // Nunca reiniciar Y: cada categoria mantém sua altura individual.
          y:element.style.y
        }
      };
    });
  }

  function updateSelectedProductionDuration(seconds:number):void {
    if(!selectedId||exportingVideo)return;
    changeElement(selectedId,element=>({...element,
      productionDuration:Math.max(1,Math.min(60,Number.isFinite(seconds)?seconds:5.3))}));
  }
  function updateSelectedProductionIncluded(value:boolean):void {
    if(!selectedId||exportingVideo)return;
    changeElement(selectedId,element=>({...element,productionIncluded:value}));
  }
  function updateSelectedPhotoCredit(photo:boolean):void {
    if(!selectedId||exportingVideo)return;
    changeElement(selectedId,element=>element.kind!=='credit'?element:{
      ...element,productionRole:photo?'photoCredit':undefined,
      fields:{...element.fields,heading:photo?'CRÉDITO FOTOGRÁFICO':'CRÉDITO DE FILMAGEM'}
    });
  }
  function wizardElementKind(kind:ElementKind,photo=false):HudElement|undefined {
    return project.elements.find(el=>el.kind===kind&&
      (kind!=='credit'||(photo?el.productionRole==='photoCredit':el.productionRole!=='photoCredit')));
  }
  function chooseWizardElement(kind:ElementKind,photo=false):void {
    let target=wizardElementKind(kind,photo);
    if(!target){
      if(project.elements.length>=MAX_ELEMENTS){notify('Limite de elementos atingido.','error');return;}
      target=makeElement(kind);
      const colors=project.palette?.colors || DEFAULT_PALETTE.colors;
      target={...target,style:{...target.style,accent:colors.primary,secondary:colors.secondary,background:colors.background}};
      if(photo)target={...target,productionRole:'photoCredit',
        fields:{...target.fields,heading:'CRÉDITO FOTOGRÁFICO',line1:'Fotografia',line2:'RDV Bus'}};
      applyChange({...project,elements:[...project.elements,target]});
    }
    selectedId=target.id;stopPlayback();
  }
  function goWizardStep(index:number):void {
    if(exportingVideo)return;
    wizardIndex=Math.max(0,Math.min(WIZARD_STEPS.length-1,index));
    wizardCreditType='film';
    chooseWizardElement(WIZARD_STEPS[wizardIndex].kind);
  }
  function startWizard():void {
    if(exportingVideo)return;
    productionMode='wizard';showExportVideo=false;
    goWizardStep(0);
  }
  function addWizardLocation():void {
    if(exportingVideo||project.elements.length>=MAX_ELEMENTS)return;
    addElement('location');
  }
  function choosePhotoWizard():void {
    wizardCreditType='photo';chooseWizardElement('credit',true);
  }
  function chooseFilmWizard():void {
    wizardCreditType='film';chooseWizardElement('credit',false);
  }
  function snapshotForElement(element:HudElement):RDVProject {
    const duration=Math.max(1,Math.min(60,element.productionDuration??project.canvas.duration));
    return {...project,canvas:{...project.canvas,duration},
      elements:[{...element,visible:true}]};
  }
  const batchKeys:{key:string;kind:ElementKind;photo?:boolean}[]=[
    {key:'Ficha_Tecnica',kind:'technical'},{key:'Linha',kind:'route'},
    {key:'Data',kind:'date'},{key:'Local',kind:'location'},
    {key:'Credito_Filmagem',kind:'credit'},
    {key:'Credito_Fotografico',kind:'credit',photo:true},
    {key:'Motorista',kind:'driver'},{key:'Texto_Livre',kind:'freeText'}
  ];
  function collectWizardElements():{name:string;element:HudElement}[] {
    const result:{name:string;element:HudElement}[]=[];
    for(const category of batchKeys){
      const rows=project.elements.filter(element=>element.kind===category.kind
        && element.productionIncluded!==false
        && (category.kind!=='credit'||Boolean(element.productionRole==='photoCredit')===Boolean(category.photo)));
      for(const [j,element] of rows.entries()){
        const safe=category.kind==='location'?'Local_'+(j+1):category.key+(j?'_'+(j+1):'');
        result.push({name:safe,element});
      }
    }
    return result;
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
        const full = (element.kind === 'technical' && ['fullscreen', 'legacyFullscreen'].includes(element.technicalLayout || '')) || (element.kind === 'freeText' && (element.freeTextStyle === 'fullTechnical' || element.freeTextStyle === 'fullPage' || ['legacyPresentationSlide','newsSlide'].includes(element.freeTextStyle || '')));
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
    time = time + delta >= activeDuration ? 0 : time + delta;
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
    if (time >= activeDuration) time = 0;
    playing = true;
    lastFrame = null;
    frameHandle = requestAnimationFrame(animationFrame);
  }

  function seek(value: number): void {
    time = clamp(value, 0, activeDuration);
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

  function openVideoDialog(kdenlive = false): void {
    if(kdenlive){
      videoFormat = KDENLIVE_OVERLAY_PRESET.format;
      rasterQuality = KDENLIVE_OVERLAY_PRESET.quality;
      exportBackground = KDENLIVE_OVERLAY_PRESET.background;
      prepareForKdenlive = true;
    }
    showExportVideo = true;
    if (!isDesktop()) notify('Para gerar vídeo, abra o RDV Bus no aplicativo desktop Tauri.', 'info');
  }

  /** Renderiza uma única categoria, sem mexer no restante do projeto salvo. */
  async function renderVideoFile(snapshot:RDVProject,output:string):Promise<number> {
    const frames=Math.round(snapshot.canvas.duration*snapshot.canvas.fps);
    if(frames<1||frames>1800)throw new Error('Duração individual excede o limite de 1.800 quadros para esta resolução/FPS.');
    const effectiveBackground:ExportBackground=videoFormat==='mp4-h264'&&exportBackground==='transparent'?'green':exportBackground;
    renderingProject=snapshot;exportTime=0;
    await tick();
    const canvas=document.createElement('canvas');
    const jobId=await beginVideo(output,snapshot.canvas.width,snapshot.canvas.height,snapshot.canvas.fps,frames,videoFormat);
    try {
      for(let index=0;index<frames;index++){
        if(cancelRequested)throw new Error('Produção cancelada.');
        exportTime=exportFrameTime(index,frames,snapshot.canvas.duration);
        await tick();
        const svg=document.querySelector<SVGSVGElement>('.export-render-stage .scene-svg');
        if(!svg)throw new Error('Quadro de exportação indisponível.');
        const xml=exportFrameSvg(svg,snapshot.canvas.width*rasterQuality,snapshot.canvas.height*rasterQuality);
        const data=await svgToPngBase64(xml,snapshot.canvas.width,snapshot.canvas.height,canvas,rasterQuality,effectiveBackground);
        await pushVideoFrame(jobId,data);
        exportProgress=batchCount>0?
          (batchCurrent+(index+1)/frames)/batchCount:(index+1)/frames;
        if(index%8===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
      }
      await finishVideo(jobId);
      return frames;
    } catch(error) {
      try{await cancelVideo(jobId);}catch{/* FFmpeg pode ter encerrado */}
      throw error;
    }
  }
  async function exportVideo():Promise<void>{
    if(exportingVideo)return;
    if(!isDesktop())return notify('Produção de vídeo exige o aplicativo Desktop Tauri.','error');
    const element=selected??project.elements.find(el=>el.visible);
    if(!element)return notify('Selecione uma categoria para gerar seu vídeo.','error');
    const preset=VIDEO_FORMATS.find(item=>item.value===videoFormat)??VIDEO_FORMATS[0];
    const cleanName=(project.name+'_'+element.title).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,75)||'rdv_bus';
    const output=await nativeSave({title:'Produzir vídeo da categoria',defaultPath:joinOutputPath(await getOutputDirectory(),
      cleanName+'.'+preset.ext),filters:[{name:preset.label,extensions:[preset.ext]}]});
    if(!output)return;
    stopPlayback();exportingVideo=true;cancelRequested=false;exportProgress=0;
    batchCount=0;selectedVideoName=output;
    const snapshot=snapshotForElement(element);
    try{
      const frames=await renderVideoFile(snapshot,output);
      outputDirectory=rememberOutputFile(output);
      showExportVideo=false;
      if(prepareForKdenlive){
        try{
          const mlt=await prepareKdenliveClip({path:output,width:snapshot.canvas.width,
            height:snapshot.canvas.height,fps:snapshot.canvas.fps,frames,
            background:videoFormat==='mp4-h264'&&exportBackground==='transparent'?'green':exportBackground});
          notify('Vídeo e clipe Kdenlive preparados: '+mlt,'success');
        }catch(error){
          notify('Vídeo exportado, mas falhou o arquivo Kdenlive: '+String(error),'error');
        }
      }else notify('Vídeo da categoria exportado: '+output,'success');
    }catch(error){notify('Falha ao gerar vídeo: '+String(error),'error');}
    finally{exportingVideo=false;cancelRequested=false;renderingProject=project;selectedVideoName='';}
  }
  /** Passo a passo: gera vídeos separados e os agrega sem sobrescrever arquivos. */
  async function produceWizardZip():Promise<void>{
    if(exportingVideo)return;
    if(!isDesktop())return notify('O ZIP de vídeos exige o aplicativo Desktop Tauri.','error');
    const list=collectWizardElements();
    if(!list.length)return notify('Marque ao menos uma categoria para gerar o ZIP.','error');
    if(list.length>24)return notify('Máximo de 24 vídeos por produção.','error');
    const preset=VIDEO_FORMATS.find(item=>item.value===videoFormat)??VIDEO_FORMATS[0];
    for(const item of list){
      if(Math.round((item.element.productionDuration??project.canvas.duration)*project.canvas.fps)>1800)
        return notify('A categoria '+item.element.title+' excede 1.800 quadros; reduza a duração ou FPS.','error');
    }
    const safeProject=project.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60)||'RDV_Bus';
    const zipPath=await nativeSave({title:'Salvar produção completa RDV Bus',defaultPath:joinOutputPath(await getOutputDirectory(),
      safeProject+'_Producao.zip'),filters:[{name:'Produção ZIP',extensions:['zip']}]});
    if(!zipPath)return;
    let stage:string|undefined;
    stopPlayback();exportingVideo=true;cancelRequested=false;exportProgress=0;
    batchCount=list.length;batchCurrent=0;
    try{
      stage=await invoke<string>('production_stage_create');
      const filenames:string[]=[];
      for(const [index,item] of list.entries()){
        if(cancelRequested)throw new Error('Produção cancelada.');
        batchCurrent=index;batchLabel=item.element.title;
        const filename=String(index+1).padStart(2,'0')+'_'+item.name+'.'+preset.ext;
        selectedVideoName='Etapa '+(index+1)+'/'+list.length+' · '+item.element.title;
        await renderVideoFile(snapshotForElement(item.element),joinOutputPath(stage,filename));
        filenames.push(filename);
      }
      if(cancelRequested)throw new Error('Produção cancelada.');
      selectedVideoName='Compactando '+list.length+' vídeos…';
      await invoke('production_bundle_zip',{stage,output:zipPath,files:filenames});
      outputDirectory=rememberOutputFile(zipPath);showExportVideo=false;
      notify('Produção concluída: '+list.length+' vídeos no ZIP '+zipPath,'success');
    }catch(error){
      notify('Falha na produção em lote: '+String(error),'error');
    }finally{
      if(stage)await invoke('production_stage_cleanup',{stage}).catch(()=>{});
      batchCount=0;batchCurrent=0;batchLabel='';renderingProject=project;
      exportingVideo=false;cancelRequested=false;selectedVideoName='';
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
    else if (event.key === 'Escape') { showHelp = false; showSettings = false; if(!exportingVideo)showExportVideo = false; }
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
<button class="button secondary-button" disabled={exportingVideo} on:click={()=>{stopPlayback();showNavigator=true;}}>GPS</button>
<UpdateCenter platform="desktop" currentVersion={APP_VERSION}/>
      <span class="autosave-mark" title={autosaveOk ? "O projeto está salvo localmente neste dispositivo" : "Armazenamento local indisponível: salve um arquivo JSON"}><span class:autosave-failed={!autosaveOk} class="autosave-dot"></span> {autosaveOk ? "Salvo localmente" : "Salve o projeto"}</span>
      <button class="button ghost-button" on:click={resetProject} title="Criar novo projeto"><Icon name="plus" size={16}/><span>Novo</span></button>
      <button class="button ghost-button" on:click={() => void openCurrentProject()} title="Abrir projeto (Ctrl+O)"><Icon name="folder" size={16}/><span>Abrir</span></button>
      <button class="button secondary-button" on:click={() => void saveCurrentProject()} title="Salvar projeto (Ctrl+S)"><Icon name="save" size={16}/><span>Salvar</span></button>
      <button class="button primary-button" on:click={() => openVideoDialog()} title="Abrir Produção: formatos, renderização, SVG e Kdenlive"><Icon name="film" size={17}/><span>Produção</span></button>
    </div>
  </header>

  <div class="workspace">
    <nav class="app-rail" aria-label="Navegação principal">
      <button class:rail-active={showLibrary} class="rail-button" aria-label="Biblioteca de elementos" title="Biblioteca" on:click={() => showLibrary = !showLibrary}><Icon name="grid" size={21}/><small>Elementos</small></button>
      <button class="rail-button" aria-label="Propriedades do projeto" title="Projeto" on:click={() => { selectedId = null; showLibrary = true; }}><Icon name="layers" size={21}/><small>Projeto</small></button>
      <div class="rail-spacer"></div>
      <button class="rail-button production-rail-button" aria-label="Abrir Produção" title="Produção de arquivos" on:click={() => openVideoDialog()}><Icon name="film" size={22}/><small>Produção</small></button>
      <button class="rail-button" aria-label="Ajuda" on:click={() => showHelp = true} title="Ajuda"><Icon name="info" size={21}/><small>Ajuda</small></button>
      <button class="rail-button" aria-label="Configurações" on:click={() => { selectedId = null; showSettings = true; }} title="Configurações"><Icon name="settings" size={21}/><small>Config.</small></button>
    </nav>

    {#if showLibrary}
      <aside class="library-panel"><LibraryPanel {project} {selectedId} onAdd={addElement} onSelect={(id) => selectedId = id} onToggleVisible={toggleVisible}/></aside>
    {/if}

    <main class="editor-main">
      {#if productionMode==='wizard'}
        <section class="wizard-desktop-bar" aria-label="Assistente de produção">
          <div class="wizard-desktop-heading">
            <strong>Passo {wizardIndex+1} de {WIZARD_STEPS.length}: {WIZARD_STEPS[wizardIndex].label}</strong>
            <button class="button secondary-button" disabled={exportingVideo} on:click={()=>productionMode='manual'}>Modo manual</button>
          </div>
          <div class="wizard-desktop-controls">
            {#if WIZARD_STEPS[wizardIndex].kind==='location'}
              {#each project.elements.filter(el=>el.kind==='location') as place,i}
                <button class="button secondary-button" class:active-wizard-item={selectedId===place.id}
                  on:click={()=>selectedId=place.id}>Local {i+1}</button>
              {/each}
              <button class="button secondary-button" on:click={addWizardLocation}>+ Adicionar local</button>
            {/if}
            {#if WIZARD_STEPS[wizardIndex].kind==='credit'}
              <button class="button secondary-button" class:active-wizard-item={wizardCreditType==='film'}
                on:click={chooseFilmWizard}>Crédito de filmagem</button>
              <button class="button secondary-button" class:active-wizard-item={wizardCreditType==='photo'}
                on:click={choosePhotoWizard}>Crédito de fotos</button>
            {/if}
            {#if selected}
              <label class="wizard-desktop-checkbox"><input type="checkbox" checked={selected.productionIncluded!==false}
                on:change={event=>updateSelectedProductionIncluded(event.currentTarget.checked)}/>
                Incluir {selected.title} no ZIP
              </label>
            {/if}
          </div>
          <div class="wizard-desktop-nav">
            <button class="button secondary-button" disabled={wizardIndex===0||exportingVideo}
              on:click={()=>goWizardStep(wizardIndex-1)}>‹ Voltar</button>
            {#if wizardIndex<WIZARD_STEPS.length-1}
              <button class="button primary-button" disabled={exportingVideo}
                on:click={()=>goWizardStep(wizardIndex+1)}>Avançar ›</button>
            {:else}
              <button class="button primary-button" disabled={exportingVideo}
                on:click={()=>openVideoDialog()}>✓ Produzir ZIP</button>
            {/if}
          </div>
        </section>
      {/if}
      <div class="canvas-toolbar">
        <div class="canvas-title"><Icon name="layout" size={17}/><strong>Editor de cena</strong><span class="breadcrumb-separator">/</span><span>Composição principal</span></div>
        <div class="canvas-toolbar-right"><button class="canvas-chip preview-toggle" class:preview-toggle-active={previewBackground === 'black'} aria-pressed={previewBackground === 'black'} title="Alternar fundo preto e transparência quadriculada" on:click={() => previewBackground = previewBackground === 'black' ? 'checker' : 'black'}><Icon name="layers" size={13}/> {previewBackground === 'black' ? 'Fundo preto' : 'Quadriculado'}</button><span class="canvas-chip"><span class="chip-dot"></span>Pré-visualização SVG</span><span class="canvas-chip resolution-chip">{project.canvas.width} × {project.canvas.height}</span></div>
      </div>
      <div class="canvas-main-area">
        <div class="canvas-stack">
          <div class="canvas-top-caption"><span><Icon name="maximize" size={15}/> Monitor de pré-visualização</span><span>{project.canvas.width === 1080 ? '9:16' : '16:9'} · SVG com transparência</span></div>
          <div class="canvas-bezel">
            <div class="stage-checker" class:stage-black={previewBackground === 'black'} class:portrait-stage={project.canvas.width === 1080} style={`aspect-ratio: ${project.canvas.width} / ${project.canvas.height}`}><ScenePreview project={editorPreviewProject} {selectedId} {time} onSelect={(id) => selectedId = id} onMove={moveElement} onResize={resizeElement}
              onBeginEdit={stopPlayback} onEditField={editTextDirect} onEditCaption={editCaptionDirect}
              onTextFormat={editTextFormatting} onParagraphFormat={editParagraphDirect} {systemFonts}/>
</div>
          </div>
          <div class="canvas-bottom-bar"><span><span class="live-indicator"></span> Cena editável</span><span>Clique no texto para editar · arraste o painel para mover · alças para redimensionar</span><span>{project.elements.filter(e => e.visible).length} visíveis de {project.elements.length}</span></div>
        </div>
      </div>
      <div class="timeline-panel"><Timeline project={timelineProject} {selectedId} {time} {playing} onTogglePlay={togglePlayback} onStop={stopAndRewind} onSeek={seek} onSelect={(id) => selectedId = id}/></div>
    </main>

    <aside class="inspector-panel"><PropertiesPanel {project} {selected} onField={updateSelectedField} onStyle={updateSelectedStyle} onTextColor={changeSelectedTextColor} onTextGroup={changeSelectedTextGroup} onProjectTextGroup={changeProjectTextGroup} onAllSelectedText={changeAllSelectedTextColor} onAllProjectText={changeAllProjectTextColor} onPalettePreset={changeProjectPalettePreset} onPaletteColor={changeProjectPaletteColor} onAnimation={updateSelectedAnimation} onShineToggle={updateSelectedShine} onDiagonalGlowToggle={updateSelectedDiagonalGlow} onDiagonalGlowIntensity={updateSelectedDiagonalIntensity} onRename={updateSelectedTitle} onDuplicate={duplicateSelected} onDelete={deleteSelected} onImage={updateSelectedImage} onFooter={updateSelectedFooter} onCanvas={changeCanvas} onTechnicalSide={updateTechnicalSide} onProductionDuration={updateSelectedProductionDuration} onProductionIncluded={updateSelectedProductionIncluded} onPhotoCredit={updateSelectedPhotoCredit} onTechnicalLayout={updateTechnicalLayout}
      {systemFonts} onFontFamily={updateSelectedFontFamily} onVisualPreset={updateSelectedVisualPreset} onFitScrollDuration={fitSelectedScrollDuration} onRichText={updateRichText} onFreeTextStyle={changeFreeTextStyle} onLabelBarSize={updateLabelBarSize} onAutoFitLabel={setLabelAutoFit} onFreeTextNote={updateSelectedFreeTextNote} onFreeTextIcon={updateSelectedFreeTextIcon} onFreeTextDisplay={updateSelectedFreeTextDisplay} onFreeTextCaption={updateFreeTextCaption} onResetScale={resetSelectedScale} onStandardizeSelected={standardizeSelectedCard} onStandardizeAll={standardizeAllCards} onSelectNone={() => selectedId = null}/></aside>
  </div>

  <footer class="app-footer"><div><span class="footer-dot"></span> RDV Bus Studio <span class="footer-divider">·</span> <span class="muted">{APP_VERSION}</span></div><div><span class="footer-stat">{project.elements.length} elemento(s)</span><span class="footer-divider">·</span><span class="footer-stat">{totalFrames} quadros</span><span class="footer-divider">·</span><span class="muted">{isDesktop() ? 'Tauri Desktop' : 'Modo navegador'}</span></div></footer>
</div>

{#if exportingVideo}
  <div class="export-render-stage" aria-hidden="true" style={`width:${project.canvas.width}px;height:${project.canvas.height}px`}>
    <ScenePreview project={renderingProject} selectedId={null} time={exportTime} onSelect={() => {}} onMove={() => {}} />
  </div>
{/if}

{#if showExportVideo}
  <div class="dialog-backdrop" role="presentation">
    <div class="help-dialog production-dialog" role="dialog" aria-modal="true" aria-label="Produção de vídeo, SVG e projeto">
      <div class="dialog-heading"><div><Icon name="film"/><strong>Produção · RDV Bus Studio</strong></div><button class="icon-button" aria-label="Fechar" disabled={exportingVideo} on:click={() => showExportVideo = false}>×</button></div>
      <div class="dialog-content video-export-content">
        <p>Escolha entre produzir a categoria selecionada ou seguir o assistente para vários vídeos em um ZIP.</p>
        <div class="production-mode-desktop" role="group" aria-label="Modo de produção">
          <button type="button" class:chosen={productionMode==='manual'} disabled={exportingVideo}
            on:click={()=>productionMode='manual'}>Manual · categoria selecionada</button>
          <button type="button" class:chosen={productionMode==='wizard'} disabled={exportingVideo}
            on:click={startWizard}>Passo a passo · ZIP</button>
        </div>
        {#if productionMode==='wizard'}
          <p class="export-description">Ordem: ficha técnica, linha, data, locais, créditos de filmagem/fotos, motorista e texto livre. As caixas desmarcadas não entram no ZIP; cada elemento tem duração própria.</p>
        {/if}
        <div class="production-project-controls">
          <label for="production-orientation">Proporção e resolução</label>
          <select id="production-orientation" value={project.canvas.width===1080?'portrait':'landscape'} disabled={exportingVideo}
            on:change={event=>changeCanvas('orientation',event.currentTarget.value)}>
            <option value="landscape">16:9 · 1920 × 1080</option>
            <option value="portrait">9:16 · 1080 × 1920</option>
          </select>
          <label for="production-fps">Quadros por segundo</label>
          <select id="production-fps" value={project.canvas.fps} disabled={exportingVideo}
            on:change={event=>changeCanvas('fps',Number(event.currentTarget.value))}>
            <option value="30">30 FPS</option><option value="60">60 FPS</option>
          </select>
          <label for="production-duration">Duração da categoria selecionada (segundos)</label>
          <input id="production-duration" type="number" min="1" max="60" step="0.1"
            value={selected?.productionDuration??project.canvas.duration}
            disabled={exportingVideo} on:change={event=>selected?updateSelectedProductionDuration(Number(event.currentTarget.value)):changeCanvas('duration',Number(event.currentTarget.value))}/>
        </div>
        <div class="production-quick-actions">
          <button type="button" class="button secondary-button" disabled={exportingVideo} on:click={() => void exportSvg()}><Icon name="download" size={16}/> Exportar quadro SVG</button>
          <button type="button" class="button secondary-button" disabled={exportingVideo} on:click={() => void saveCurrentProject()}><Icon name="save" size={16}/> Salvar projeto JSON</button>
          <button type="button" class="button secondary-button" disabled={exportingVideo}
            on:click={() => { videoFormat=KDENLIVE_OVERLAY_PRESET.format; rasterQuality=KDENLIVE_OVERLAY_PRESET.quality;
              exportBackground=KDENLIVE_OVERLAY_PRESET.background;prepareForKdenlive=true; }}>
            <Icon name="film" size={16}/> Preset Kdenlive · MOV alfa
          </button>
        </div>
        <p class="export-description">Saída: {totalFrames} quadros, {project.canvas.fps} FPS e {project.canvas.width} × {project.canvas.height}. Para MP4, selecione Chroma Key verde/azul; para transparência, MOV/MKV/WebM.</p>
        {#if isDesktop()}<p class="export-description">Pasta de saída: <code>{outputDirectory || '~/RDV Bus Studio'}</code> <button class="button ghost-button" on:click={() => void openOutputFolder()} disabled={exportingVideo}><Icon name="folder" size={15}/> Abrir pasta</button></p>{/if}
        <label for="video-format">Formato de vídeo</label>
        <select id="video-format" bind:value={videoFormat} disabled={exportingVideo}
          on:change={() => { if(videoFormat==='mp4-h264' && exportBackground==='transparent') exportBackground='green'; }}>
          {#each VIDEO_FORMATS as preset}<option value={preset.value}>{preset.label}</option>{/each}
        </select>
        <p class="export-description">{VIDEO_FORMATS.find(item => item.value === videoFormat)?.description}</p>
        <label class="export-description" style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" bind:checked={prepareForKdenlive} disabled={exportingVideo}/>
          Preparar clipe para Kdenlive (.mlt + guia ao lado do vídeo)
        </label>
        {#if prepareForKdenlive}
          <p class="export-description">Recomendação: MOV QuickTime Animation + transparência + qualidade 2×. O arquivo .mlt é um clipe auxiliar de biblioteca; também é possível importar o vídeo diretamente na timeline do Kdenlive. No MP4 verde/azul, aplique Chroma Key no Kdenlive.</p>
        {/if}
        <label for="raster-quality">Qualidade de bordas (SVG → PNG)</label>
        <select id="raster-quality" bind:value={rasterQuality} disabled={exportingVideo}>
          <option value={1}>Normal — 1× (mais rápido)</option>
          <option value={2}>Alta — 2× supersampling (recomendado)</option>
        </select>
        <p class="export-description">2× renderiza os vetores em resolução ampliada antes de reduzir para 1080p. Melhora diagonais e contornos, mas aumenta o trabalho de renderização.</p>
        <label for="export-background">Fundo do vídeo</label>
        <select id="export-background" bind:value={exportBackground} disabled={exportingVideo}>
          <option value="transparent" disabled={videoFormat==='mp4-h264'}>Transparente — alfa nativo (MOV/MKV/WebM)</option>
          <option value="black">Preto — vídeo convencional</option>
          <option value="green">Verde puro (#00FF00) — Chroma Key</option>
          <option value="blue">Azul puro (#0000FF) — Chroma Key alternativo</option>
        </select>
        {#if exportBackground === 'black'}
          <p class="video-warning">O fundo preto permite reprodução convencional, mas não fornece transparência para sobreposição.</p>
        {:else if exportBackground === 'green' || exportBackground === 'blue'}
          <p class="video-warning">No editor, aplique Chroma Key para remover o fundo {exportBackground==='green'?'verde':'azul'}. O H.264 usa cor 4:2:0 e pode criar halos nas bordas; ajuste similaridade e suavização. Escolha uma cor que não apareça na arte.</p>
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
          <p class="export-description">{selectedVideoName} {batchCount>0?`· ${batchCurrent+1}/${batchCount}: ${batchLabel}`:''}</p>
        {/if}
      </div>
      <div class="dialog-actions">
        {#if exportingVideo}
          <button class="button secondary-button" on:click={() => cancelRequested = true} disabled={cancelRequested}>Cancelar geração</button>
        {:else}
          <button class="button ghost-button" on:click={() => showExportVideo = false}>Voltar à edição</button>
          <button class="button primary-button" on:click={() => void (productionMode==='wizard'?produceWizardZip():exportVideo())}
            disabled={!isDesktop()}><Icon name="film" size={16}/> {productionMode==='wizard'?'Produzir ZIP':'Gerar vídeo da categoria'}</button>
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

{#if showNavigator}<Navigator palette={project.palette?.colors||DEFAULT_PALETTE.colors} onClose={()=>showNavigator=false} saveText={saveNavigatorText} renderVideo={renderNavigator}/>{/if}
