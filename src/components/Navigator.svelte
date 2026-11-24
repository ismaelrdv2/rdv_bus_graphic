<script lang="ts">
 import {onDestroy} from 'svelte';
 import {at,demoTrack,parseTrack,parseMap,mp4Creation,frameSvg,type Track,type MapLine,type Palette,type View} from '../lib/telemetry';
 export let palette:Palette;
 export let onClose:()=>void;
 export let saveText:(name:string,content:string,mime:string)=>Promise<void>;
 export let renderVideo:(width:number,height:number,duration:number,fps:30|60,render:(t:number)=>string,progress:(n:number,total:number)=>void,cancel:()=>boolean)=>Promise<string>;
 export let mobile=false;
 export let gps:{start:()=>Promise<void>;stop:()=>Promise<Track>;status:()=>Promise<boolean>}|undefined=undefined;
 let track=demoTrack(),roads:MapLine[]=[],start=track.points[0].t,clock=0,duration=60,offset=0;
 let url='',video:HTMLVideoElement,videoCreation:number|null=null,clockOrigin:'start'|'end'='start';
 let running=false,timer:ReturnType<typeof setInterval>|undefined,last=0;
 let orientation:'landscape'|'portrait'='landscape',corner='bottom-right',scale=1,opacity=.95,heading=true,tilt=false,radius=220,autoZoom=true,theme='dark',gauge='digital',map=true;
 let status='Percurso fictício carregado. Nenhuma localização real foi registrada.',fps:30|60=60,exporting=false,cancelled=false,recording=false;
 let stamp='';
 $: view={width:orientation==='portrait'?1080:1920,height:orientation==='portrait'?1920:1080,corner,scale,opacity,heading,tilt,radius,autoZoom,theme,gauge,map,palette} as View;
 $: current=at(track,start+(clock+offset)*1000);
 $: svg=frameSvg(track,start+(clock+offset)*1000,view,roads);
 $: stamp=new Date(start).toISOString().slice(0,23)+'Z';
 $: if(gps)void gps.status().then(v=>recording=v).catch(()=>{});
 function stop(){running=false;if(timer!==undefined)clearInterval(timer);timer=undefined;video?.pause();}
 function seek(n:number){clock=Math.max(0,Math.min(duration,n));if(video&&url)video.currentTime=clock;}
 function play(){if(running){stop();return;}if(clock>=duration)seek(0);running=true;last=performance.now();if(video&&url)void video.play().catch(e=>{stop();status=String(e)});timer=setInterval(()=>{const now=performance.now();clock=video&&url?video.currentTime:Math.min(duration,clock+(now-last)/1000);last=now;if(clock>=duration||video?.ended)stop();},33);}
 function loadTrack(t:Track){stop();track=t;start=t.points[0].t;offset=0;clock=0;if(url&&videoCreation!==null)align();else if(!url)duration=(t.points[t.points.length-1].t-start)/1000;seek(0);}
 async function openTrack(e:Event){const input=e.currentTarget as HTMLInputElement;const f=input.files?.[0];if(!f)return;try{if(f.size>60e6)throw Error('Arquivo GPS acima de 60 MB.');loadTrack(parseTrack(await f.text(),f.name));status='Telemetria importada. Confira o alinhamento antes de exportar.';}catch(err){status=String(err);}finally{input.value='';}}
 async function openMap(e:Event){const input=e.currentTarget as HTMLInputElement;const f=input.files?.[0];if(!f)return;try{if(f.size>60e6)throw Error('Mapa acima de 60 MB.');roads=parseMap(await f.text());status=roads.length+' vias importadas. Use cartografia licenciada e preserve a atribuição.';}catch(err){status=String(err);}finally{input.value='';}}
 async function openVideo(e:Event){const f=(e.currentTarget as HTMLInputElement).files?.[0];if(!f)return;stop();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);videoCreation=null;clock=0;try{videoCreation=await mp4Creation(f);status=videoCreation===null?'Sem horário MP4 reconhecido; informe o início manualmente.':'Horário MP4 encontrado. Confirme se corresponde ao início ou ao final.';align();}catch(err){status=String(err);}}
 function loadedVideo(){if(!video||!Number.isFinite(video.duration))return;duration=video.duration;orientation=video.videoHeight>video.videoWidth?'portrait':'landscape';align();}
 function align(){if(videoCreation!==null)start=videoCreation-(clockOrigin==='end'?duration*1000:0);}
 function setStamp(v:string){const n=Date.parse(v);if(Number.isFinite(n))start=n;else status='Horário inválido. Informe ISO 8601 com fuso horário.';}
 function demo(){if(url)URL.revokeObjectURL(url);url='';roads=[];loadTrack(demoTrack());status='Percurso fictício (não representa uma viagem real).';}
 async function saveGps(){try{await saveText('telemetria.rdvgps',JSON.stringify(track),'application/json');status='Sessão GPS disponibilizada.';}catch(err){status=String(err);}}
 async function saveCsv(){try{await saveText('telemetria.csv','time,lat,lon,speed_mps,bearing\n'+track.points.map(p=>[new Date(p.t).toISOString(),p.lat,p.lon,p.speed??'',p.bearing??''].join(',')).join('\n'),'text/csv');}catch(err){status=String(err);}}
 async function saveGpx(){try{const xml='<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RDV Bus Studio" xmlns="http://www.topografix.com/GPX/1/1" xmlns:rdv="urn:rdv:telemetry"><trk><trkseg>'+track.points.map(p=>'<trkpt lat="'+p.lat+'" lon="'+p.lon+'"><time>'+new Date(p.t).toISOString()+'</time><extensions>'+(p.speed===undefined?'':'<rdv:speed>'+p.speed+'</rdv:speed>')+'</extensions></trkpt>').join('')+'</trkseg></trk></gpx>';await saveText('telemetria.gpx',xml,'application/gpx+xml');}catch(err){status=String(err);}}
 async function record(){if(!gps)return;try{if(recording){const t=await gps.stop();recording=false;loadTrack(t);status='Registro encerrado; salve a sessão GPS.';}else{await gps.start();recording=true;status='Registro iniciado. Pode abrir a câmera Samsung.';}}catch(err){recording=await gps.status().catch(()=>false);status=String(err);}}
 async function exportClip(){stop();if(exporting)return;if(mobile&&Math.ceil(duration*fps)>1800){status='Limite atual Android: 1.800 quadros por exportação. Use 30 FPS ou exporte no Desktop.';return;}const tr=track,rs=roads,v={...view,palette:{...palette}},base=start+offset*1000,d=duration;exporting=true;cancelled=false;try{status=await renderVideo(v.width,v.height,d,fps,t=>frameSvg(tr,base+t*1000,v,rs),(n,total)=>status='Renderizando '+n+'/'+total,()=>cancelled);}catch(err){status=String(err);}finally{exporting=false;}}
 onDestroy(()=>{stop();if(url)URL.revokeObjectURL(url);});
</script>
<section class="gps-shell" aria-label="Navigator GPS">
 <header><div><strong>RDV Bus Studio · Navigator</strong><small>Telemetria sincronizada · Alpha</small></div><button disabled={exporting} on:click={onClose}>Voltar ao Studio</button></header>
 <div class="gps-actions"><button disabled={exporting} on:click={demo}>Percurso demonstrativo</button>{#if gps}<button disabled={exporting} on:click={()=>void record()}>{recording?'Encerrar GPS':'Iniciar GPS em segundo plano'}</button>{/if}
 <label>Importar GPS <input disabled={exporting} type="file" accept=".gpx,.csv,.json,.rdvgps" on:change={openTrack}/></label>
 <label>Importar vídeo original <input disabled={exporting} type="file" accept="video/mp4,video/*" on:change={openVideo}/></label>
 <label>Mapa de ruas GeoJSON <input disabled={exporting} type="file" accept=".geojson,.json" on:change={openMap}/></label></div>
 <div class="gps-content">
 <div><div class="gps-preview" style:aspect-ratio={orientation==='portrait'?'9/16':'16/9'}>{#if url}<video bind:this={video} src={url} on:loadedmetadata={loadedVideo} playsinline preload="metadata"></video>{:else}<div class="gps-empty"> {track.demo?'MODO DEMONSTRAÇÃO':'PRÉVIA TRANSPARENTE'} </div>{/if}<div class="gps-overlay">{@html svg}</div></div>
 <div class="gps-timeline"><button on:click={play} disabled={exporting}>{running?'Pausar':'Reproduzir'}</button><input aria-label="Tempo do vídeo" type="range" min="0" max={duration} step=".0333333" value={clock} on:input={e=>seek(Number(e.currentTarget.value))}/><span>{clock.toFixed(2)} / {duration.toFixed(2)} s</span></div>
 <p>{current?.speed===undefined?'GPS / velocidade indisponível':Math.round(current.speed*3.6)+' km/h'} · {track.points.length} pontos {track.demo?'fictícios':''}</p></div>
 <div class="gps-controls">
 <h3>Sincronização</h3><label>Horário inicial (UTC / ISO 8601)<input value={stamp} on:change={e=>setStamp(e.currentTarget.value)}/></label>
 {#if videoCreation!==null}<label>Horário do MP4<select bind:value={clockOrigin} on:change={align}><option value="start">Início</option><option value="end">Final</option></select></label>{/if}
 <label>Ajuste GPS (segundos)<input type="number" step=".1" bind:value={offset}/></label>
 <h3>Visualização</h3><label>Formato<select bind:value={orientation}><option value="landscape">16:9</option><option value="portrait">9:16</option></select></label>
 <label>Canto<select bind:value={corner}><option value="top-left">Superior esquerdo</option><option value="top-right">Superior direito</option><option value="bottom-left">Inferior esquerdo</option><option value="bottom-right">Inferior direito</option></select></label>
 <label>Escala<input type="range" min=".4" max="2.5" step=".05" bind:value={scale}/></label><label>Opacidade<input type="range" min=".15" max="1" step=".05" bind:value={opacity}/></label>
 <label>Velocímetro<select bind:value={gauge}><option value="digital">Digital</option><option value="analog">Digital + analógico</option></select></label>
 <label><input type="checkbox" bind:checked={map}/> Mostrar minimapa</label><label><input type="checkbox" bind:checked={heading}/> Girar na direção do veículo</label><label><input type="checkbox" bind:checked={tilt}/> Vista inclinada experimental (2,5D)</label><label><input type="checkbox" bind:checked={autoZoom}/> Zoom conforme a velocidade</label>
 <label>Raio do mapa (m)<input type="range" min="70" max="1200" step="10" bind:value={radius}/></label><label>Tema<select bind:value={theme}><option value="dark">Escuro</option><option value="light">Claro</option></select></label>
 <h3>Exportação</h3><label>FPS<select bind:value={fps}><option value={30}>30 FPS</option><option value={60}>60 FPS</option></select></label>
 <button disabled={exporting} on:click={()=>void saveText('navigator.svg',svg,'image/svg+xml')}>Salvar quadro SVG</button>
 <button disabled={exporting} on:click={()=>void exportClip()}>{mobile?'Gerar PNG alfa em ZIP':'Gerar vídeo transparente MOV'}</button>{#if exporting}<button on:click={()=>cancelled=true}>Cancelar exportação</button>{/if}
 <div class="gps-actions"><button disabled={exporting} on:click={()=>void saveGps()}>RDVGPS</button><button disabled={exporting} on:click={()=>void saveCsv()}>CSV</button><button disabled={exporting} on:click={()=>void saveGpx()}>GPX</button></div>
 </div></div><p role="status">{status}</p><small>Sem cartografia importada, dados reais mostram apenas o traçado GPS. Ruas automáticas e mapa 3D real ainda não disponíveis.</small>
</section>
<style>
.gps-shell{position:fixed;inset:0;z-index:300;background:#160f20;color:#f6f0fd;overflow:auto;padding:16px;box-sizing:border-box;font:14px system-ui,sans-serif}
.gps-shell header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.gps-shell strong{font-size:19px;color:#e2ba5a}.gps-shell small{display:block;color:#bda4d9;margin:6px 0}.gps-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}.gps-shell button,.gps-shell input,.gps-shell select{font:inherit;color:inherit;background:#2c1e3c;border:1px solid #69468a;border-radius:6px;padding:8px;min-width:0;max-width:100%;box-sizing:border-box}.gps-shell button:disabled{opacity:.5}.gps-shell label{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.gps-content{display:grid;grid-template-columns:minmax(0,2fr) minmax(250px,1fr);gap:16px}.gps-preview{position:relative;background:#101015;max-height:70vh;margin:auto;width:100%;overflow:hidden}.gps-preview video,.gps-overlay,.gps-empty{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.gps-overlay{pointer-events:none}.gps-overlay :global(svg){width:100%;height:100%}.gps-empty{display:grid;place-items:center;color:#a294b2;background:repeating-conic-gradient(#24202c 0% 25%,#1c1823 0% 50%) 50%/20px 20px}.gps-timeline{display:flex;align-items:center;gap:8px;margin:8px 0;flex-wrap:wrap}.gps-timeline input{flex:1}.gps-controls{display:grid;gap:8px;align-content:start}.gps-controls h3{margin:8px 0 2px;color:#e2ba5a}.gps-controls label{justify-content:space-between}.gps-controls input:not([type=checkbox]),.gps-controls select{max-width:65%}.gps-shell p{color:#d4c4e7;overflow-wrap:anywhere}@media(max-width:750px){.gps-content{grid-template-columns:1fr}.gps-shell{padding:10px}.gps-preview{max-height:55vh}}
</style>