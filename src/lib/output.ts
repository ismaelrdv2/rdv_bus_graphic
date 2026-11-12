import { invoke, isTauri } from '@tauri-apps/api/core';

const KEY = 'rdv-bus-studio:output-directory:v1';

/** Prioriza a última pasta escolhida pelo usuário; a primeira execução usa ~/RDV Bus Studio. */
export async function getOutputDirectory(): Promise<string> {
  if (!isTauri()) return '';
  let saved = '';
  try { saved = localStorage.getItem(KEY)?.trim() || ''; } catch { /* persistência opcional */ }
  return saved || invoke<string>('desktop_default_output_directory');
}

export function joinOutputPath(dir: string, filename: string): string {
  if (!dir) return filename;
  const normalized = dir.replace(/[\\/]+$/, '');
  return normalized + (normalized.includes('\\') ? '\\' : '/') + filename;
}

export function rememberOutputFile(filename: string): string {
  const pos = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  if (pos <= 0) return '';
  const directory = filename.slice(0, pos);
  try { localStorage.setItem(KEY, directory); } catch { /* arquivo já salvo */ }
  return directory;
}

export async function openOutputDirectory(): Promise<string> {
  if (!isTauri()) throw new Error('Disponível somente no aplicativo Desktop.');
  const path = await getOutputDirectory();
  return invoke<string>('desktop_open_output_directory', { path });
}
