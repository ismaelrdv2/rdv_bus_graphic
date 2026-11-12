import { invoke } from '@tauri-apps/api/core';

export type RasterQuality = 1 | 2;
export type ExportBackground = 'transparent' | 'black';

export type VideoFormat = 'mov-qtrle' | 'mov-prores' | 'mkv-ffv1' | 'webm-vp9';

export const VIDEO_FORMATS: { value: VideoFormat; label: string; ext: string; description: string }[] = [
  { value: 'mov-qtrle', label: 'MOV — QuickTime Animation (sem perdas)', ext: 'mov', description: 'RGBA, arquivos grandes, indicado para edição' },
  { value: 'mov-prores', label: 'MOV — ProRes 4444', ext: 'mov', description: '10 bits com canal alfa, alta compatibilidade em editores' },
  { value: 'mkv-ffv1', label: 'MKV — FFV1 (sem perdas)', ext: 'mkv', description: 'RGBA sem perdas, para arquivamento e edição' },
  { value: 'webm-vp9', label: 'WebM — VP9 com alfa (4:2:0)', ext: 'webm', description: 'Alfa exige decodificador compatível e a subamostragem 4:2:0 reduz a definição de cores nas bordas.' },
];

/** O FFmpeg recebe PNGs sequenciais pelo stdin; nunca armazenamos todos em RAM. */
export async function beginVideo(path: string, width: number, height: number, fps: number, frames: number, format: VideoFormat): Promise<string> {
  return invoke<string>('video_begin', { path, width, height, fps, frames, format });
}
export async function pushVideoFrame(jobId: string, base64: string): Promise<void> {
  await invoke('video_frame', { jobId, data: base64 });
}
export async function finishVideo(jobId: string): Promise<string> {
  return invoke<string>('video_finish', { jobId });
}
export async function cancelVideo(jobId: string): Promise<void> {
  await invoke('video_cancel', { jobId });
}

export function exportFrameSvg(svg: SVGSVGElement, width: number, height: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.removeAttribute('class');
  clone.removeAttribute('role');
  clone.removeAttribute('aria-label');
  clone.querySelectorAll('[data-editor-overlay]').forEach(node => node.remove());
  clone.querySelectorAll('[data-edit-field],[data-edit-caption]').forEach(node => {
    node.removeAttribute('data-edit-field'); node.removeAttribute('data-edit-caption');
  });
  clone.querySelectorAll('[role],[tabindex],[class],[aria-label]').forEach(node => {
    node.removeAttribute('role'); node.removeAttribute('tabindex'); node.removeAttribute('class'); node.removeAttribute('aria-label');
  });
  return new XMLSerializer().serializeToString(clone);
}

/**
 * Rasteriza SVG sem perder o vetor antes da etapa final de amostragem.
 * Em qualidade alta, renderiza a 2x e reduz para a resolução pedida, usando
 * Canvas 2D de alta qualidade. Mantém somente um par de buffers por quadro.
 * A correção definitiva por renderizador SVG nativo (resvg) virá depois.
 */
export async function svgToPngBase64(
  xml: string, width: number, height: number, canvas: HTMLCanvasElement,
  quality: RasterQuality = 2, background: ExportBackground = 'transparent'
): Promise<string> {
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const bitmap = new Image();
    bitmap.src = url;
    await bitmap.decode();

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: background === 'transparent' });
    if (!ctx) throw new Error('Não foi possível inicializar o Canvas 2D.');
    ctx.clearRect(0, 0, width, height);

    if (background === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    }
    if (quality === 1) {
      ctx.drawImage(bitmap, 0, 0, width, height);
    } else {
      const supersampled = document.createElement('canvas');
      supersampled.width = width * quality;
      supersampled.height = height * quality;
      const hiCtx = supersampled.getContext('2d', { alpha: true });
      if (!hiCtx) throw new Error('Não foi possível inicializar o Canvas de superamostragem.');
      hiCtx.clearRect(0, 0, supersampled.width, supersampled.height);
      hiCtx.drawImage(bitmap, 0, 0, supersampled.width, supersampled.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(supersampled, 0, 0, width, height);
      // Libera o buffer de alta resolução o quanto antes.
      supersampled.width = supersampled.height = 0;
    }
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao codificar PNG.')), 'image/png')
    );
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(new Error('Falha ao ler quadro PNG.'));
      reader.readAsDataURL(png);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
