import type { SavedDocument } from '../types/doc';
import { parseDocumentFile, safeFileStem, toFilePayload } from './documents';
import { idbDel, idbGet, idbSet } from './idb';

const HANDLE_KEY = 'folder-handle';

export function canPickFolder(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
  interactive = false,
) {
  const state = await handle.queryPermission({ mode });
  if (state === 'granted') return true;
  if (!interactive) return false;
  const next = await handle.requestPermission({ mode });
  return next === 'granted';
}

export async function rememberFolder(handle: FileSystemDirectoryHandle) {
  await idbSet(HANDLE_KEY, handle);
}

export async function forgetFolder() {
  await idbDel(HANDLE_KEY);
}

export async function restoreFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY);
    if (!handle) return null;
    const ok = await ensurePermission(handle, 'readwrite', false);
    return ok ? handle : null;
  } catch {
    return null;
  }
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!canPickFolder()) return null;
  const handle = await window.showDirectoryPicker!({
    id: 'macau-docs',
    mode: 'readwrite',
    startIn: 'documents',
  });
  const ok = await ensurePermission(handle, 'readwrite', true);
  if (!ok) return null;
  await rememberFolder(handle);
  return handle;
}

function fileNameFor(doc: SavedDocument): string {
  return `${safeFileStem(doc.name)}-${doc.id}.json`;
}

async function jsonNamesForId(handle: FileSystemDirectoryHandle, id: string): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.json') && entry.name.includes(id)) {
      names.push(entry.name);
    }
  }
  return names;
}

export async function writeDocToFolder(handle: FileSystemDirectoryHandle, doc: SavedDocument) {
  const keep = fileNameFor(doc);
  const stale = (await jsonNamesForId(handle, doc.id)).filter((name) => name !== keep);
  for (const name of stale) await handle.removeEntry(name);
  const fileHandle = await handle.getFileHandle(keep, { create: true });
  const body = JSON.stringify(toFilePayload(doc), null, 2);
  const writable = await fileHandle.createWritable({ keepExistingData: false });
  await writable.write(new TextEncoder().encode(body));
  await writable.close();
}

export async function removeDocFromFolder(handle: FileSystemDirectoryHandle, doc: SavedDocument) {
  for (const name of await jsonNamesForId(handle, doc.id)) {
    await handle.removeEntry(name);
  }
}

export async function readDocsFromFolder(handle: FileSystemDirectoryHandle): Promise<SavedDocument[]> {
  const list: SavedDocument[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.json')) continue;
    try {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const parsed = parseDocumentFile(await file.text());
      if (parsed) list.push(parsed);
    } catch {
      /* skip unreadable files */
    }
  }
  return list;
}
