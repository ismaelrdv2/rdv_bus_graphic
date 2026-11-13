/** Verificação de versões publicadas, sem downloads silenciosos nem remoção de dados. */
export type UpdatePlatform = 'desktop' | 'android';
export interface PublishedUpdate {
  version: string;
  url: string;
  notes: string;
  publishedAt: string | null;
  /** O arquivo continua sendo instalado pelo sistema operacional. */
  assetName?: string;
}
export type UpdateCheckResult =
  | { status:'available'; update:PublishedUpdate }
  | { status:'current' | 'unpublished'; update:null };

const DESKTOP_REPO = 'ismaelrdv2/rdv_bus_graphic';
const MOBILE_REPO = 'ismaelrdv2/RDV-Bus-Studio-Mobile';
const MOBILE_FEED = 'https://raw.githubusercontent.com/ismaelrdv2/rdv_bus_graphic/main/updates/mobile.json';
const RELEASE_API = `https://api.github.com/repos/${DESKTOP_REPO}/releases?per_page=20`;

export function compareVersions(a:string,b:string):number {
  function parse(raw:string) {
    const match=raw.trim().replace(/^(desktop|mobile)[-_]/i,'').match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
    if(!match)return null;
    return { main:match.slice(1,4).map(Number),pre:match[4]?.split('.')??[] };
  }
  const left=parse(a),right=parse(b);
  if(!left||!right)return NaN;
  for(let i=0;i<3;i++){if(left.main[i]!==right.main[i])return left.main[i]>right.main[i]?1:-1;}
  if(!left.pre.length&&!right.pre.length)return 0;
  if(!left.pre.length)return 1;
  if(!right.pre.length)return -1;
  for(let i=0;i<Math.max(left.pre.length,right.pre.length);i++){
    const l=left.pre[i],r=right.pre[i];
    if(l===undefined)return -1;
    if(r===undefined)return 1;
    if(l===r)continue;
    const ln=/^\d+$/.test(l),rn=/^\d+$/.test(r);
    if(ln&&rn)return Number(l)>Number(r)?1:-1;
    if(ln!==rn)return ln?-1:1;
    return l>r?1:-1;
  }
  return 0;
}

function versionFromTag(tag:unknown):string|null {
  if(typeof tag!=='string')return null;
  const normalized=tag.replace(/^(desktop|mobile)[-_]/i,'').replace(/^v/,'');
  return Number.isNaN(compareVersions(normalized,normalized))?null:normalized;
}
function isOfficialReleaseUrl(raw:unknown,repo:string):raw is string {
  if(typeof raw!=='string')return false;
  try {
    const url=new URL(raw);
    return url.protocol==='https:'&&url.hostname==='github.com' &&
      url.pathname.startsWith(`/${repo}/releases/`);
  }catch{return false;}
}
function desktopPlatform(userAgent:string):'windows'|'linux'|null {
  const name=userAgent.toLowerCase();
  if(name.includes('windows'))return 'windows';
  if(name.includes('linux'))return 'linux';
  return null;
}
function desktopAssetName(name:string,platform:'windows'|'linux'):boolean {
  if(platform==='linux')return /\.AppImage$/i.test(name);
  return /\.exe$/i.test(name)&&/(setup|installer|instalador|nsis)/i.test(name);
}
type GitHubAsset={name?:unknown;browser_download_url?:unknown};
type GitHubRelease={tag_name?:unknown;html_url?:unknown;body?:unknown;published_at?:unknown;draft?:unknown;assets?:unknown};

/** Apenas releases com binário adequado são exibidos; CI Artifacts não são versões publicadas. */
export function desktopUpdateFromReleases(
  response:unknown,currentVersion:string,userAgent:string,
):UpdateCheckResult {
  const platform=desktopPlatform(userAgent);
  if(!platform)return {status:'unpublished',update:null};
  if(!Array.isArray(response)||!response.length)return {status:'unpublished',update:null};
  const options:PublishedUpdate[]=[];
  for(const raw of response) {
    if(!raw||typeof raw!=='object')continue;
    const rel=raw as GitHubRelease;
    if(rel.draft===true||!isOfficialReleaseUrl(rel.html_url,DESKTOP_REPO))continue;
    const version=versionFromTag(rel.tag_name);
    if(!version||!Array.isArray(rel.assets))continue;
    const asset=(rel.assets as GitHubAsset[]).find(a=>
      typeof a.name==='string'&&desktopAssetName(a.name,platform)&&
      isOfficialReleaseUrl(a.browser_download_url,DESKTOP_REPO));
    if(!asset)continue;
    options.push({version,url:rel.html_url,notes:typeof rel.body==='string'?rel.body.slice(0,2000):'',
      publishedAt:typeof rel.published_at==='string'?rel.published_at:null,assetName:asset.name as string});
  }
  if(!options.length)return {status:'unpublished',update:null};
  options.sort((a,b)=>compareVersions(b.version,a.version));
  const latest=options[0];
  return compareVersions(latest.version,currentVersion)>0
    ? {status:'available',update:latest}
    : {status:'current',update:null};
}

/** Metadata pública de uma release Android; o APK pode continuar hospedado em repositório privado. */
export function mobileUpdateFromFeed(feed:unknown,currentVersion:string):UpdateCheckResult {
  if(!feed||typeof feed!=='object')return {status:'unpublished',update:null};
  const release=(feed as {release?:unknown}).release;
  if(!release||typeof release!=='object')return {status:'unpublished',update:null};
  const entry=release as {version?:unknown;url?:unknown;notes?:unknown;publishedAt?:unknown};
  const version=versionFromTag(entry.version);
  if(!version||!isOfficialReleaseUrl(entry.url,MOBILE_REPO))
    return {status:'unpublished',update:null};
  return compareVersions(version,currentVersion)>0
    ? {status:'available',update:{
        version,url:entry.url,notes:typeof entry.notes==='string'?entry.notes.slice(0,2000):'',
        publishedAt:typeof entry.publishedAt==='string'?entry.publishedAt:null}}
    : {status:'current',update:null};
}

export async function checkPublishedUpdates(
  platform:UpdatePlatform,currentVersion:string,agent:string,
  fetcher:typeof fetch=fetch,
):Promise<UpdateCheckResult> {
  const endpoint=platform==='desktop'?RELEASE_API:MOBILE_FEED;
  const response=await fetcher(endpoint,{headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error(response.status===403?'Consulta limitada pelo GitHub. Tente novamente mais tarde.':'Não foi possível consultar as versões publicadas.');
  const json:unknown=await response.json();
  return platform==='desktop' ? desktopUpdateFromReleases(json,currentVersion,agent)
    : mobileUpdateFromFeed(json,currentVersion);
}
