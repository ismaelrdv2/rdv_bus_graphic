import { isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { newProject } from './templates';
import type { RDVProject } from './types';
import { validateProject } from './validation';

const AUTOSAVE_KEY = 'rdv-bus-studio:autosave:v1';
const FILE_LIMIT = 40_000_000;

export function loadAutosave(): RDVProject {
  try {
    const text = localStorage.getItem(AUTOSAVE_KEY);
    return text ? validateProject(JSON.parse(text)) : newProject();
  } catch {
    return newProject();
  }
}

export function writeAutosave(project: RDVProject): boolean {
  try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project)); return true; }
  catch { return false; /* Quota esgotada: salvar manualmente permanece disponível. */ }
}

function safeFileName(name: string): string {
  const clean = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 75);
  return `${clean || 'rdv-bus'}.rdv.json`;
}

export async function saveProject(project: RDVProject): Promise<boolean> {
  const text = JSON.stringify(project, null, 2) + '\n';
  if (text.length > FILE_LIMIT) throw new Error('Projeto muito grande para exportação (limite de 40 MB).');
  const suggestedName = safeFileName(project.name);
  if (isTauri()) {
    const path = await save({ defaultPath: suggestedName, title: 'Salvar projeto RDV Bus', filters: [{ name: 'Projeto RDV Bus', extensions: ['json'] }] });
    if (!path) return false;
    await writeTextFile(path, text);
    return true;
  }
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export async function openProjectNative(): Promise<RDVProject | null> {
  if (!isTauri()) return null;
  const path = await open({ title: 'Abrir projeto RDV Bus', multiple: false, directory: false, filters: [{ name: 'Projeto RDV Bus', extensions: ['json'] }] });
  if (!path || typeof path !== 'string') return null;
  const text = await readTextFile(path);
  if (text.length > FILE_LIMIT) throw new Error('O arquivo do projeto é grande demais (limite de 40 MB).');
  return validateProject(JSON.parse(text));
}

export async function openProjectBrowser(file: File): Promise<RDVProject> {
  if (file.size > FILE_LIMIT) throw new Error('O arquivo do projeto é grande demais (limite de 40 MB).');
  return validateProject(JSON.parse(await file.text()));
}

export function isDesktop(): boolean { return isTauri(); }
