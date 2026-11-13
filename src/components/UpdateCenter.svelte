<script lang="ts">
  import {onMount} from 'svelte';
  import {checkPublishedUpdates, type PublishedUpdate, type UpdatePlatform} from '../lib/updateCheck';

  export let platform:UpdatePlatform;
  export let currentVersion:string;
  let opened=false;
  let busy=false;
  let checked=false;
  let error='';
  let release:PublishedUpdate|null=null;
  let hasPublished=false;

  async function verify(showResult:boolean):Promise<void>{
    if(busy)return;
    busy=true;error='';
    try {
      const result=await checkPublishedUpdates(platform,currentVersion,navigator.userAgent);
      checked=true;
      release=result.status==='available'?result.update:null;
      hasPublished=result.status!=='unpublished';
      if(release||showResult)opened=true;
    }catch(e){
      checked=true;
      if(showResult){error=e instanceof Error?e.message:String(e);opened=true;}
    }finally{busy=false;}
  }

  onMount(()=>{void verify(false);});
</script>

<div class="rdv-updates">
  <button type="button" class:available={!!release} class="update-trigger"
    title="Verificar novas versões publicadas no GitHub" disabled={busy}
    on:click={()=>{opened=true;void verify(true);}}>
    {#if busy}Verificando…{:else if release}Nova versão {release.version}{:else}Atualizações{/if}
  </button>
</div>

{#if opened}
  <div class="update-backdrop" role="presentation">
    <section class="update-dialog" role="dialog" aria-modal="true" aria-label="Atualizações do RDV Bus Studio">
      <div class="update-heading">
        <strong>Atualizações do RDV Bus Studio</strong>
        <button type="button" aria-label="Fechar atualizações" on:click={()=>opened=false}>×</button>
      </div>
      <p class="installed">Versão instalada: <strong>{currentVersion}</strong></p>
      {#if busy}
        <p>Consultando versões publicadas no GitHub…</p>
      {:else if error}
        <p role="alert">{error}</p>
      {:else if release}
        <p class="new-title">Nova versão disponível: <strong>{release.version}</strong></p>
        {#if release.notes}<p class="notes">{release.notes}</p>{/if}
        <p class="important">Antes de atualizar, salve seu projeto. Não desinstale o aplicativo atual.</p>
        {#if platform==='desktop'}
          <p>Windows: execute o instalador oficial sobre a instalação existente. Linux AppImage: substitua o arquivo antigo apenas depois de baixar e verificar o novo. Não remova a pasta dos seus projetos.</p>
        {:else}
          <p>Android: instale o APK oficial sobre o aplicativo existente. A atualização exige o mesmo identificador e certificado de assinatura, além de versionCode compatível. O GitHub poderá solicitar acesso à versão privada.</p>
        {/if}
        <a class="release-link" href={release.url} target="_blank" rel="noopener noreferrer">Abrir versão oficial no GitHub</a>
      {:else if checked}
        <p>{hasPublished?'Seu aplicativo está na versão mais recente publicada para esta plataforma.':'Nenhuma versão instalável foi publicada no canal de atualização. Os arquivos temporários de GitHub Actions não são atualizações.'}</p>
      {/if}
      <p class="footnote">A instalação não é executada automaticamente nesta etapa. A substituição automática só será ativada com pacotes assinados e testados.</p>
      <div class="update-actions">
        <button type="button" disabled={busy} on:click={()=>void verify(true)}>Verificar novamente</button>
        <button type="button" on:click={()=>opened=false}>Fechar</button>
      </div>
    </section>
  </div>
{/if}

<style>
  .update-trigger{padding:8px 12px;min-height:34px;background:rgba(131,77,181,.15);color:inherit;border:1px solid rgba(181,141,224,.4);border-radius:9px;font:inherit;font-size:12px;font-weight:650;cursor:pointer;white-space:nowrap}
  .update-trigger.available{border-color:#d4ad58;color:#f0d593}
  .update-backdrop{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(6,4,12,.78)}
  .update-dialog{width:min(540px,100%);max-height:min(85vh,760px);overflow:auto;padding:20px;border-radius:15px;border:1px solid rgba(199,155,231,.45);background:#20142f;color:#f5edf9;box-shadow:0 12px 60px #0008;font-size:14px;line-height:1.52}
  .update-heading{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:17px}
  .update-heading button{border:0;background:transparent;color:inherit;font-size:24px;cursor:pointer}
  .installed{opacity:.8;font-size:13px}
  .new-title{font-size:15px}
  .notes{white-space:pre-line;max-height:130px;overflow:auto;padding:9px;background:#32213e;border-radius:8px}
  .important{font-weight:700;color:#f2d394}
  .release-link{display:inline-block;margin:8px 0;padding:10px 14px;border-radius:9px;background:#7c4db0;color:#fff;font-weight:700;text-decoration:none}
  .footnote{font-size:12px;color:#cbbad4}
  .update-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}
  .update-actions button{border:1px solid #9176a4;border-radius:7px;padding:8px 11px;background:#38264d;color:#fff;font:inherit;cursor:pointer}
  .update-actions button:disabled{opacity:.6}
</style>
