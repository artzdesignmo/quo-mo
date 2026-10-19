import { createDefaultDoc } from '../data/defaults';
import { newId } from './money';
import { normalizeCustom, normalizeDocData } from './formats';
import { idbGet, idbSet } from './idb';
import {
  DOCUMENT_FILE_KIND,
  LEGACY_STYLE_MAP,
  type DocData,
  type DocumentFilePayload,
  type LayoutCustom,
  type SavedDocument,
  type StyleId,
} from '../types/doc';
import { STYLE_LIST } from '../data/styles';

const KEY = 'macau-docs-files';
const ACTIVE_KEY = 'macau-docs-active-file';
const IDB_FILES = 'files';
const IDB_ACTIVE = 'active-file';

export function defaultDocumentName(data: DocData): string {
  const buyer = data.buyer.name.trim();
  const series = data.seriesId.trim();
  if (buyer && series) return `${buyer} · ${series}`;
  if (buyer) return buyer;
  if (series) return series;
  return '未命名單據';
}

export function normalizeSavedDocument(raw: Partial<SavedDocument> | null | undefined): SavedDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const styleRaw = typeof raw.styleId === 'string' ? raw.styleId : '';
  const styleId = (STYLE_LIST.some((s) => s.id === styleRaw) ? styleRaw : LEGACY_STYLE_MAP[styleRaw] || 'classic') as StyleId;
  return {
    id: raw.id || newId('doc'),
    name: (raw.name || '').trim() || defaultDocumentName(normalizeDocData(raw.data)),
    savedAt: raw.savedAt || new Date().toISOString(),
    styleId,
    custom: normalizeCustom(raw.custom),
    data: normalizeDocData(raw.data),
  };
}

function readDocumentsFromLocalStorage(): SavedDocument[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDocument[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSavedDocument).filter((item): item is SavedDocument => !!item);
  } catch {
    return [];
  }
}

export function readDocuments(): SavedDocument[] {
  return readDocumentsFromLocalStorage();
}

export async function loadDocuments(): Promise<SavedDocument[]> {
  let stored: SavedDocument[] = [];
  try {
    const raw = await idbGet<SavedDocument[]>(IDB_FILES);
    if (Array.isArray(raw)) {
      stored = raw.map(normalizeSavedDocument).filter((item): item is SavedDocument => !!item);
    }
  } catch {
    stored = [];
  }
  const legacy = readDocumentsFromLocalStorage();
  const merged = mergeDocumentLists(stored, legacy);
  if (legacy.length) {
    try {
      await idbSet(IDB_FILES, merged);
      localStorage.removeItem(KEY);
    } catch {
      /* keep both copies if migrate fails */
    }
  }
  return merged;
}

export async function writeDocuments(list: SavedDocument[]) {
  await idbSet(IDB_FILES, list);
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function readActiveFileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export async function loadActiveFileId(): Promise<string | null> {
  try {
    const fromIdb = await idbGet<string>(IDB_ACTIVE);
    if (fromIdb) return fromIdb;
  } catch {
    /* fall through */
  }
  return readActiveFileId();
}

export async function writeActiveFileId(id: string | null) {
  try {
    if (id) {
      await idbSet(IDB_ACTIVE, id);
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      await idbSet(IDB_ACTIVE, '');
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function createSavedDocument(
  name: string,
  styleId: StyleId,
  custom: LayoutCustom,
  data: DocData,
  id?: string,
): SavedDocument {
  const doc = normalizeDocData(data);
  return {
    id: id || newId('doc'),
    name: name.trim() || defaultDocumentName(doc),
    savedAt: new Date().toISOString(),
    styleId,
    custom: normalizeCustom(custom),
    data: doc,
  };
}

export function toFilePayload(document: SavedDocument): DocumentFilePayload {
  return {
    kind: DOCUMENT_FILE_KIND,
    version: 1,
    document,
  };
}

function looksLikeDocument(raw: unknown): raw is Partial<SavedDocument> | Partial<DocData> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const item = raw as Record<string, unknown>;
  return (
    'data' in item ||
    'seller' in item ||
    'items' in item ||
    'styleId' in item ||
    item.kind === DOCUMENT_FILE_KIND ||
    typeof item.name === 'string'
  );
}

function documentFromUnknown(raw: unknown): SavedDocument | null {
  if (typeof raw === 'string') {
    try {
      return documentFromUnknown(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const found = documentFromUnknown(item);
      if (found) return found;
    }
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (item.document) {
    const nested = documentFromUnknown(item.document);
    if (nested) return nested;
  }
  if (Array.isArray(item.files)) {
    const nested = documentFromUnknown(item.files);
    if (nested) return nested;
  }
  if (!looksLikeDocument(item)) return null;
  if ('seller' in item && 'items' in item && !('data' in item)) {
    return createSavedDocument(
      defaultDocumentName(normalizeDocData(item as Partial<DocData>)),
      'classic',
      normalizeCustom(null),
      normalizeDocData(item as Partial<DocData>),
    );
  }
  return normalizeSavedDocument(item as Partial<SavedDocument>);
}

export function parseDocumentFile(text: string): SavedDocument | null {
  try {
    const cleaned = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!cleaned) return null;
    return documentFromUnknown(JSON.parse(cleaned));
  } catch {
    return null;
  }
}

export async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }
  const sample = bytes.subarray(0, Math.min(64, bytes.length));
  const zeros = [...sample].filter((byte) => byte === 0).length;
  if (sample.length && zeros > sample.length / 3) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function readDocumentFromFile(file: File): Promise<SavedDocument | null> {
  if (!file) return null;
  const text = file.size ? await readFileText(file) : '';
  if (!text.trim()) return null;
  return parseDocumentFile(text);
}

function fileBlob(payload: unknown): Blob {
  const body = JSON.stringify(payload, null, 2);
  return new Blob([body], { type: 'application/json;charset=utf-8' });
}

export function downloadJson(filename: string, payload: unknown) {
  const suggested = filename.endsWith('.json') ? filename : `${filename}.json`;
  const url = URL.createObjectURL(fileBlob(payload));
  const a = document.createElement('a');
  a.href = url;
  a.download = suggested;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function saveJsonToDisk(filename: string, payload: unknown): Promise<'picked' | 'downloaded'> {
  const suggested = filename.endsWith('.json') ? filename : `${filename}.json`;
  downloadJson(suggested, payload);
  return 'downloaded';
}

export function styleNameOf(styleId: StyleId): string {
  return STYLE_LIST.find((item) => item.id === styleId)?.name || styleId;
}

export function fileLabel(item: SavedDocument): string {
  return item.name || defaultDocumentName(item.data || createDefaultDoc());
}

export function mergeDocumentLists(local: SavedDocument[], incoming: SavedDocument[]): SavedDocument[] {
  const map = new Map<string, SavedDocument>();
  for (const item of local) map.set(item.id, item);
  for (const item of incoming) {
    const prev = map.get(item.id);
    if (!prev || Date.parse(item.savedAt) >= Date.parse(prev.savedAt)) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
}

export function safeFileStem(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'macau-docs';
}
