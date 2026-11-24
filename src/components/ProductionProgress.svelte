<script lang="ts">
 export let projectName:string;
 export let progress=0;
 export let detail='';
 export let cancelling=false;
 export let onCancel:()=>void;
 $: percent=Math.round(Math.max(0,Math.min(1,progress))*100);
</script>
<div class="progress-backdrop" role="presentation">
 <section class="progress-dialog" role="dialog" aria-modal="true" aria-label="Produção em andamento" aria-busy="true">
 <h2>Produção em andamento</h2><strong class="project-name">{projectName}</strong>
 <div class="progress-head"><span>{cancelling?'Cancelando…':percent>=100?'Finalizando arquivos…':'Produzindo…'}</span><b>{percent}%</b></div>
 <progress max="1" value={Math.max(0,Math.min(1,progress))} aria-label="Progresso total da produção"></progress>
 <p role="status">{detail}</p>
 <small>Recomendamos permanecer nesta tela até o término. A janela fechará automaticamente.</small>
 <button type="button" disabled={cancelling||percent>=100} on:click={onCancel}>{cancelling?'Cancelando…':'Cancelar exportação'}</button>
 </section>
</div>
<style>
.progress-backdrop{position:fixed;inset:0;z-index:1000;background:#09060be8;display:grid;place-items:center;box-sizing:border-box;padding:calc(12px + max(28px,var(--safe-area-inset-top,env(safe-area-inset-top,0px)))) 14px calc(12px + max(24px,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px))));}
.progress-dialog{box-sizing:border-box;width:min(100%,460px);max-height:100%;overflow:auto;background:#261931;color:#f5eafa;border:1px solid #815789;border-radius:18px;padding:24px;display:grid;gap:16px;box-shadow:0 24px 80px #000a;font:14px system-ui,sans-serif}
h2{font-size:19px;color:#e8c36f;margin:0}.project-name{overflow-wrap:anywhere;font-size:16px}.progress-head{display:flex;justify-content:space-between;align-items:center;color:#e8c36f}progress{width:100%;height:14px;accent-color:#e8c36f}p{margin:0;overflow-wrap:anywhere;color:#e5d5f1}small{color:#baa5c9;line-height:1.5}button{min-height:44px;border-radius:9px;background:#3b294a;color:#fff;border:1px solid #815789;font:inherit}button:disabled{opacity:.6}
</style>
