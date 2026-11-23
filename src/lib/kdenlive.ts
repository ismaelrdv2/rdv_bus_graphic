import {invoke} from '@tauri-apps/api/core';
import type {ExportBackground,VideoFormat} from './video';

export const KDENLIVE_OVERLAY_PRESET = {
  format: 'mov-qtrle' as VideoFormat,
  background: 'transparent' as ExportBackground,
  quality: 2 as const,
};

/**
 * Cria um clipe de biblioteca MLT referenciando o vídeo exportado.
 * O arquivo .mlt é um auxiliar: não substitui o MOV nem gera um
 * projeto .kdenlive completo com as faixas do usuário.
 */
export async function prepareKdenliveClip(options:{
  path:string;width:number;height:number;fps:number;frames:number;
  background:ExportBackground;
}):Promise<string>{
  return invoke<string>('kdenlive_prepare_clip',options);
}
