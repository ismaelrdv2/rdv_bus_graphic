export interface Sample { t:number; lat:number; lon:number; speed?:number; bearing?:number; accuracy?:number; street?:string }
export interface ManualKey { time:number; speedKmh:number; street:string; lat?:number; lon?:number }
export interface Track { demo:boolean; points:Sample[]; manualKeys?:ManualKey[]; manualDuration?:number }
export interface MapLine { coords:[number,number][]; name?:string }
export interface Palette { primary:string; secondary:string; background:string }
export interface View { width:number; height:number; corner:string; scale:number; opacity:number; heading:boolean; tilt:boolean; radius:number; autoZoom:boolean; theme:string; gauge:string; map:boolean; palette:Palette; backgroundOpacity?:number }
const rad=Math.PI/180;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const angle=(a:number,b:number,f:number)=>(a+(((b-a+540)%360)-180)*f+360)%360;
export function distance(a:Sample,b:Sample){const dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;return 6371000*2*Math.asin(Math.sqrt(clamp(h,0,1)))}
export function direction(a:Sample,b:Sample){const d=(b.lon-a.lon)*rad;return (Math.atan2(Math.sin(d)*Math.cos(b.lat*rad),Math.cos(a.lat*rad)*Math.sin(b.lat*rad)-Math.sin(a.lat*rad)*Math.cos(b.lat*rad)*Math.cos(d))/rad+360)%360}
export function normalizeTrack(raw:unknown,demo=false):Track {
 if(!Array.isArray(raw)||raw.length>500000)throw Error('Sessão inválida ou muito extensa.');
 const points:Sample[]=[];
 for(const v of raw){if(!v||typeof v!=='object')continue;const {t,lat,lon,speed,bearing,accuracy,street}=v;
 if(!finite(t)||!finite(lat)||!finite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
 points.push({t,lat,lon,...(finite(speed)&&speed>=0?{speed}:{}),...(finite(bearing)?{bearing:(bearing%360+360)%360}:{}),...(finite(accuracy)&&accuracy>=0?{accuracy}:{}),...(typeof street==='string'?{street:street.slice(0,120)}:{})});}
 points.sort((a,b)=>a.t-b.t);
 const clean=points.filter((p,i)=>i===0||p.t>points[i-1].t);
 if(clean.length<2)throw Error('São necessários ao menos dois pontos GPS com horário.');
 return {demo,points:clean};
}
export function at(track:Track,t:number,maxGap=5000):Sample|null{
 if(track.manualKeys)return manualAt(track.manualKeys,t);
 const p=track.points;if(!finite(t)||!p.length||t<p[0].t||t>p[p.length-1].t)return null;
 let lo=0,hi=p.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(p[m].t<=t)lo=m;else hi=m;}
 const a=p[lo],b=p[hi],dt=b.t-a.t;
 if((t!==a.t&&t!==b.t&&dt>maxGap)||(a.accuracy??0)>100||(b.accuracy??0)>100)return null;
 const f=dt?(t-a.t)/dt:0;const fallback=dt>0&&dt<=maxGap?distance(a,b)/(dt/1000):undefined;
 const s1=a.speed??fallback,s2=b.speed??fallback;
 const course=distance(a,b)>2?direction(a,b):undefined;
 const d1=a.bearing??course,d2=b.bearing??course;
 return {t,lat:a.lat+(b.lat-a.lat)*f,lon:a.lon+(((b.lon-a.lon+540)%360)-180)*f,speed:s1!==undefined&&s2!==undefined?s1+(s2-s1)*f:undefined,bearing:d1!==undefined&&d2!==undefined?angle(d1,d2,f):undefined,street:f<.5?a.street:b.street};
}
export function parseTrack(text:string,filename:string):Track {
 if(/\.gpx$/i.test(filename)||text.trimStart().startsWith('<')) {
 const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('GPX inválido.');
 const rows=Array.from(doc.getElementsByTagNameNS('*','trkpt')).map(e=>{const val=(tag:string)=>e.getElementsByTagNameNS('*',tag)[0]?.textContent;return {t:Date.parse(val('time')||''),lat:Number(e.getAttribute('lat')??NaN),lon:Number(e.getAttribute('lon')??NaN),speed:val('speed')?Number(val('speed')):undefined};});return normalizeTrack(rows);
 }
 if(/\.csv$/i.test(filename)){const lines=text.trim().split(/\r?\n/),sep=lines[0].includes(';')?';':',';const fields=lines.shift()!.toLowerCase().replace(/^\uFEFF/,'').split(sep).map(s=>s.trim());const col=(row:string[],...keys:string[])=>row[fields.findIndex(x=>keys.includes(x))];
 return normalizeTrack(lines.map(line=>{const r=line.split(sep),v=col(r,'t','time','timestamp'),speed=col(r,'speed_mps','speed'),km=col(r,'speed_kmh');return {t:/^\d{13}$/.test(v||'')?Number(v):Date.parse(v||''),lat:Number(col(r,'lat','latitude')||NaN),lon:Number(col(r,'lon','longitude')||NaN),speed:km?Number(km)/3.6:speed?Number(speed):undefined,bearing:col(r,'bearing')?Number(col(r,'bearing')):undefined};}));}
 const o=JSON.parse(text);if(o?.format==='rdv-manual-v1')return makeManualTrack(o.keys,o.duration);return normalizeTrack(Array.isArray(o)?o:o.points,o.demo===true);
}
export function demoTrack():Track {
 const t=Date.UTC(2026,0,1,12),points:Sample[]=[];let lat=-15.6,lon=-56.1;
 for(let i=0;i<=60;i++){const speed=Math.max(0,14*Math.sin(i/60*Math.PI));const bearing=i<28?0:90;points.push({t:t+i*1000,lat,lon,speed,bearing,street:i<28?'Via demonstrativa A':'Via demonstrativa B'});lat+=Math.cos(bearing*rad)*speed/111195;lon+=Math.sin(bearing*rad)*speed/(111195*Math.cos(lat*rad));}return normalizeTrack(points,true);
}
export function parseMap(text:string):MapLine[]{
 const o=JSON.parse(text);const fs=o.type==='FeatureCollection'?o.features:[];if(!Array.isArray(fs)||fs.length>50000)throw Error('GeoJSON inválido ou muito extenso.');
 const result:MapLine[]=[];let count=0;
 for(const f of fs){const g=f?.geometry;if(!g)continue;const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];for(const line of lines){if(!Array.isArray(line))continue;const coords=line.filter(c=>Array.isArray(c)&&finite(c[0])&&finite(c[1])&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90).map(c=>[c[0],c[1]] as [number,number]);count+=coords.length;if(count>300000)throw Error('Mapa muito extenso; importe um recorte do trajeto.');if(coords.length>1)result.push({coords,name:typeof f.properties?.name==='string'?f.properties.name.slice(0,120):undefined});}}
 return result;
}
export async function mp4Creation(file:Blob):Promise<number|null>{
 async function scan(start:number,end:number,depth=0):Promise<number|null>{
  for(let pos=start;pos+8<=end;){const v=new DataView(await file.slice(pos,Math.min(end,pos+32)).arrayBuffer());let size=v.getUint32(0),header=8;const type=String.fromCharCode(...new Uint8Array(v.buffer,4,4));if(size===1){if(v.byteLength<16)return null;size=Number(v.getBigUint64(8));header=16;}if(size===0)size=end-pos;if(size<header||pos+size>end||!Number.isSafeInteger(size))return null;
  if(type==='moov'&&depth===0){const x=await scan(pos+header,pos+size,1);if(x!==null)return x;}
  if(type==='mvhd'&&depth===1&&v.byteLength>=header+12){const version=v.getUint8(header);const seconds=version===1?Number(v.getBigUint64(header+4)):version===0?v.getUint32(header+4):0;const ms=(seconds-2082844800)*1000;return ms>=Date.UTC(2000,0,1)&&ms<=Date.UTC(2100,0,1)?ms:null;}pos+=size;
 }return null;}
 return scan(0,file.size);
}
const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const color=(s:string,f:string)=>/^#[0-9a-f]{6}$/i.test(s)?s:f;
export function frameSvg(track:Track,t:number,v:View,roads:MapLine[]=[]):string{
 if(track.manualKeys&&!manualHasMap(track))v={...v,map:false};
 const s=at(track,t),W=v.width,H=v.height,P=color(v.palette.primary,'#E2BA5A'),S=color(v.palette.secondary,'#B98BE8'),B=color(v.palette.background,'#200F31');
 const w=400,h=v.map?246:100,k=clamp(v.scale,.3,2.5)*Math.min(W,H)/1080;
 const x=v.corner.includes('right')?W-w*k-24:24,y=v.corner.includes('bottom')?H-h*k-24:24;
 let map='';const light=v.theme==='light',bg=light?'#e8e8e1':'#292c32',line=light?'#b7b7ac':'#555a62',fg=light?'#222':'#fff';
 if(v.map){const r=v.autoZoom&&s?clamp(v.radius*(.65+(s.speed??0)/20),70,1500):v.radius;
 const center=s??track.points[0],rot=v.heading?-(s?.bearing??0)*rad:0;
 const project=(lat:number,lon:number)=>{const dx=(((lon-center.lon+540)%360)-180)*111195*Math.cos(center.lat*rad),dy=-(lat-center.lat)*111195;const px=dx*Math.cos(rot)-dy*Math.sin(rot),py=dx*Math.sin(rot)+dy*Math.cos(rot);return [200+px*180/r,132+py*180/r*(v.tilt?.55:1)];};
 const path=(pts:[number,number][])=>pts.map((p,i)=>{const q=project(p[1],p[0]);return (i?'L':'M')+q.map(n=>n.toFixed(1)).join(' ')}).join(' ');
 const local=roads.filter(l=>l.coords.some(p=>Math.abs(p[1]-center.lat)<.05&&Math.abs(p[0]-center.lon)<.05));
 const route=track.points.filter(p=>Math.abs(p.t-t)<180000||distance(center,p)<r*2).map(p=>[p.lon,p.lat] as [number,number]);
 const past=track.points.filter(p=>p.t<=t&&distance(center,p)<r*2).map(p=>[p.lon,p.lat] as [number,number]);if(s)past.push([s.lon,s.lat]);
 const grid=track.demo&&!roads.length?Array.from({length:9},(_,i)=>'<path d="M'+(i*50)+' 48 V218 M8 '+(48+i*22)+' H392" stroke="'+line+'" stroke-width="4"/>').join(''):'';
 map='<defs><clipPath id="mapclip"><rect x="8" y="48" width="384" height="168"/></clipPath></defs><rect x="8" y="48" width="384" height="168" rx="3" fill="'+bg+'"/><g clip-path="url(#mapclip)">'+grid+local.map(l=>'<path d="'+path(l.coords)+'" stroke="'+line+'" stroke-width="5" stroke-linejoin="round" fill="none"/>').join('')+'<path d="'+path(route)+'" stroke="'+S+'" stroke-width="4" stroke-dasharray="7 5" fill="none"/><path d="'+path(past)+'" stroke="'+P+'" stroke-width="5" stroke-linejoin="round" fill="none"/>'+(s?'<g transform="translate(200 132) rotate('+(v.heading?0:s.bearing??0)+')"><path d="M0 -13 L-9 10 L0 5 L9 10Z" fill="#fff" stroke="'+B+'" stroke-width="2"/></g>':'')+'<text x="17" y="208" font-size="10" fill="'+fg+'">'+(track.manualKeys?'TRAJETO ESTIMADO':track.demo?'MAPA DEMONSTRATIVO':roads.length?'Mapa local importado':'Traçado GPS · sem cartografia')+'</text><text x="380" y="63" text-anchor="end" font-size="11" fill="'+fg+'">'+(v.heading?'↑':'N ↑')+'</text></g>';
 }
 const speed=s?.speed===undefined?'—':Math.round(s.speed*3.6).toString();const street=s?.street??(s?'Via não identificada':track.manualKeys?'Sem dados manuais neste instante':'GPS indisponível');
 const analog=v.gauge==='analog'&&s?.speed!==undefined?'<path d="M274 38 A36 36 0 0 1 346 38" fill="none" stroke="'+S+'" stroke-width="3"/><path d="M310 38 l'+(29*Math.cos(Math.PI*(1-clamp(s.speed*3.6/100,0,1)))).toFixed(2)+' '+(-29*Math.sin(Math.PI*(1-clamp(s.speed*3.6/100,0,1)))).toFixed(2)+'" stroke="'+P+'" stroke-width="3"/>':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><g transform="translate('+x+' '+y+') scale('+k+')" opacity="'+clamp(v.opacity,.15,1)+'" font-family="Arial,sans-serif"><rect width="'+w+'" height="'+h+'" rx="10" fill="'+B+'" fill-opacity="'+clamp((v.backgroundOpacity??100)/100,0,1)+'" stroke="'+S+'" stroke-width="2"/><rect x="0" y="10" width="4" height="'+(h-20)+'" fill="'+P+'"/><text x="15" y="34" fill="'+P+'" font-size="29" font-weight="bold">'+speed+'</text><text x="86" y="34" fill="'+S+'" font-size="13">km/h</text>'+analog+'<text x="385" y="24" fill="'+S+'" text-anchor="end" font-size="10">'+(track.manualKeys?'ESTIMADO · MANUAL':track.demo?'DEMONSTRAÇÃO':'GPS')+'</text>'+map+'<text x="15" y="'+(h-13)+'" fill="#fff" font-size="13">'+esc(street.slice(0,47))+'</text></g></svg>';
}

/** Fração aproximada do vídeo com amostras válidas; não confunde coincidência temporal com validação de campo. */
export function coverage(track:Track,start:number,duration:number):number{
 if(!Number.isFinite(start)||!Number.isFinite(duration)||duration<=0)return 0;
 const n=Math.min(600,Math.max(1,Math.ceil(duration)));
 let valid=0;for(let i=0;i<n;i++)if(at(track,start+(i+.5)*duration*1000/n))valid++;
 return valid/n;
}
export function bestAlignment(track:Track,creation:number|null,duration:number){
 if(track.manualKeys)return {start:0,origin:'start' as const,manual:true};
 const first=track.points[0].t;
 if(creation===null)return {start:first,origin:'start' as const,manual:true};
 const a=coverage(track,creation,duration),b=coverage(track,creation-duration*1000,duration);
 if(track.demo&&a===0&&b===0)return {start:first,origin:'start' as const,manual:true};
 return b>a?{start:creation-duration*1000,origin:'end' as const,manual:false}:{start:creation,origin:'start' as const,manual:false};
}

/** Pontos manuais usam segundos do vídeo, sem data GPS inventada. */
export function makeManualTrack(raw:unknown,duration:number):Track {
 if(!Array.isArray(raw)||raw.length>10000||!finite(duration)||duration<=0||duration>86400)throw Error('Projeto manual inválido.');
 const keys:ManualKey[]=[];
 for(const k of raw){
   if(!k||!finite(k.time)||k.time<0||k.time>86400||!finite(k.speedKmh)||k.speedKmh<0||k.speedKmh>300)throw Error('Tempo ou velocidade inválidos.');
   const has=k.lat!==undefined||k.lon!==undefined;
   if(has&&(!finite(k.lat)||!finite(k.lon)||Math.abs(k.lat)>90||Math.abs(k.lon)>180))throw Error('Informe latitude e longitude válidas, ou deixe ambas vazias.');
   const key:ManualKey={time:Math.round(k.time*1000)/1000,speedKmh:k.speedKmh,street:typeof k.street==='string'?k.street.slice(0,120):'',...(has?{lat:k.lat,lon:k.lon}:{})};
   const i=keys.findIndex(p=>p.time===key.time);if(i<0)keys.push(key);else keys[i]=key;
 }
 keys.sort((a,b)=>a.time-b.time);
 const located=keys.length>=2&&keys.every(k=>finite(k.lat)&&finite(k.lon));
 const points:Sample[]=located?keys.map(k=>({t:k.time*1000,lat:k.lat!,lon:k.lon!,speed:k.speedKmh/3.6,street:k.street})):[{t:0,lat:NaN,lon:NaN}];
 return {demo:false,points,manualKeys:keys,manualDuration:duration};
}
export function manualHasMap(track:Track){return !!track.manualKeys&&track.manualKeys.length>=2&&track.manualKeys.every(k=>finite(k.lat)&&finite(k.lon));}
export function manualAt(keys:ManualKey[],ms:number):Sample|null{
 const t=ms/1000;if(!finite(t)||!keys.length||t<keys[0].time||t>keys[keys.length-1].time)return null;
 let lo=0,hi=keys.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(keys[m].time<=t)lo=m;else hi=m;}
 const a=keys[lo],b=keys[hi],f=b.time===a.time?0:clamp((t-a.time)/(b.time-a.time),0,1);
 const located=finite(a.lat)&&finite(a.lon)&&finite(b.lat)&&finite(b.lon);
 let lat=NaN,lon=NaN,bearing:number|undefined;
 if(located){lat=a.lat!+(b.lat!-a.lat!)*f;lon=a.lon!+(((b.lon!-a.lon!+540)%360)-180)*f;const p={t:0,lat:a.lat!,lon:a.lon!},q={t:0,lat:b.lat!,lon:b.lon!};if(distance(p,q)>2)bearing=direction(p,q);}
 return {t:ms,lat,lon,bearing,speed:(a.speedKmh+(b.speedKmh-a.speedKmh)*f)/3.6,street:(f>=1?b.street:a.street)||undefined};
}
export function serializeTrack(track:Track,duration:number):string{
 return JSON.stringify(track.manualKeys?{format:'rdv-manual-v1',duration,keys:track.manualKeys}:track,null,2);
}
