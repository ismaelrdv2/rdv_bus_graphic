import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url';

let wasmReady;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = initWasm(fetch(wasmUrl));
  }
  return wasmReady;
}

export async function renderSvgPixels(svg, options = {}) {
  await ensureWasm();
  const renderer = new Resvg(svg, options);
  let rendered;
  try {
    rendered = renderer.render();
    return {
      width: rendered.width,
      height: rendered.height,
      pixels: new Uint8Array(rendered.pixels),
    };
  } finally {
    try { rendered?.free?.(); } catch (_) {}
    try { renderer.free?.(); } catch (_) {}
  }
}

// O módulo é empacotado pelo Vite junto com o WASM. Não há CDN nem dependência
// de conexão externa durante a execução do aplicativo.
window.RDVResvgRuntimePromise = Promise.resolve({ renderSvgPixels });
