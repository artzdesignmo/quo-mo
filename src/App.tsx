import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FolderClosed } from 'lucide-react';
import { DEFAULT_CUSTOM, STYLE_LIST } from './data/styles';
import { createFreshDoc } from './data/defaults';
import { createSavedFormat, normalizeCustom, normalizeDocData, readSavedFormats, writeSavedFormats } from './lib/formats';
import {
  createSavedDocument,
  defaultDocumentName,
  loadActiveFileId,
  loadDocuments,
  mergeDocumentLists,
  normalizeSavedDocument,
  readDocumentFromFile,
  saveJsonToDisk,
  styleNameOf,
  toFilePayload,
  writeActiveFileId,
  writeDocuments,
} from './lib/documents';
import {
  canPickFolder,
  forgetFolder,
  pickFolder,
  readDocsFromFolder,
  removeDocFromFolder,
  restoreFolder,
  writeDocToFolder,
} from './lib/folderStore';
import { LEGACY_STYLE_MAP, type LayoutCustom, type SavedDocument, type SavedFormat, type StyleId } from './types/doc';
import StyleGallery from './components/docs/StyleGallery';
import Studio from './components/docs/Studio';
import LibraryPanel from './components/docs/LibraryPanel';
import Gate from './components/docs/Gate';
import './styles/sheets.css';

const DATA_KEY = 'macau-docs-data';
const GATE_KEY = 'macau-docs-gate';
const CUSTOM_KEY = 'macau-docs-custom';
const STYLE_KEY = 'macau-docs-style';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readStyle(raw: unknown): StyleId | null {
  if (typeof raw !== 'string') return null;
  if (STYLE_LIST.some((s) => s.id === raw)) return raw as StyleId;
  return LEGACY_STYLE_MAP[raw] || null;
}

function customForStyle(styleId: StyleId | null, base: LayoutCustom): LayoutCustom {
  const meta = STYLE_LIST.find((s) => s.id === styleId);
  if (!meta || styleId === 'custom') return base;
  return {
    ...base,
    accent: meta.accent,
    paper: meta.paper,
    ink: meta.ink,
  };
}

function readGateUnlocked(): boolean {
  try {
    return sessionStorage.getItem(GATE_KEY) === 'ok';
  } catch {
    return false;
  }
}

export default function App() {
  const [unlocked, setUnlocked] = useState(readGateUnlocked);
  const [step, setStep] = useState<'gallery' | 'studio'>('gallery');
  const [styleId, setStyleId] = useState<StyleId | null>(() => readStyle(readJson(STYLE_KEY, null)));
  const [custom, setCustom] = useState<LayoutCustom>(() =>
    customForStyle(readStyle(readJson(STYLE_KEY, null)), normalizeCustom(readJson(CUSTOM_KEY, DEFAULT_CUSTOM))),
  );
  const [data, setData] = useState(() => normalizeDocData(readJson(DATA_KEY, null)));
  const [formats, setFormats] = useState<SavedFormat[]>(() => readSavedFormats());
  const [appliedFormatId, setAppliedFormatId] = useState<string | null>(null);
  const [files, setFiles] = useState<SavedDocument[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const folderRef = useRef<FileSystemDirectoryHandle | null>(null);
  const noticeTimer = useRef<number>(0);

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2400);
  };

  useEffect(() => {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
    } catch {
      /* IndexedDB holds named files; working copy may exceed localStorage */
    }
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    } catch {
      /* ignore quota */
    }
  }, [custom]);

  useEffect(() => {
    if (!styleId) return;
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(styleId));
    } catch {
      /* ignore quota */
    }
  }, [styleId]);

  useEffect(() => {
    if (!styleId || styleId === 'custom') return;
    const meta = STYLE_LIST.find((s) => s.id === styleId);
    if (!meta) return;
    const legacy: Partial<Record<StyleId, string[]>> = {
      classic: ['#f7d4d6', '#f7f1e8'],
      navy: ['#f3eee4'],
    };
    const olds = (legacy[styleId] || []).map((c) => c.toLowerCase());
    setCustom((prev) => {
      if (!olds.includes(prev.paper.toLowerCase())) return prev;
      return { ...prev, paper: meta.paper };
    });
  }, [styleId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, active, handle] = await Promise.all([
        loadDocuments(),
        loadActiveFileId(),
        restoreFolder(),
      ]);
      if (cancelled) return;
      let nextFiles = stored;
      if (handle) {
        folderRef.current = handle;
        setFolderName(handle.name);
        try {
          const remote = await readDocsFromFolder(handle);
          if (!cancelled) nextFiles = mergeDocumentLists(stored, remote);
        } catch {
          /* keep local list */
        }
      }
      if (cancelled) return;
      setFiles(nextFiles);
      setActiveFileId(active && nextFiles.some((item) => item.id === active) ? active : null);
      void writeDocuments(nextFiles);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeFileId || !styleId) return;
    const timer = window.setTimeout(() => {
      setFiles((prev) => {
        const current = prev.find((item) => item.id === activeFileId);
        if (!current) return prev;
        const nextDoc: SavedDocument = {
          ...current,
          savedAt: new Date().toISOString(),
          styleId,
          custom,
          data,
        };
        const next = [nextDoc, ...prev.filter((item) => item.id !== activeFileId)];
        void writeDocuments(next).catch(() => {
          showNotice('儲存失敗，請再試一次。');
        });
        const handle = folderRef.current;
        if (handle) {
          void writeDocToFolder(handle, nextDoc).catch(() => {
            showNotice('資料夾寫入失敗，已改存在此瀏覽器。');
          });
        }
        return next;
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [activeFileId, custom, data, styleId]);

  const persistActive = (id: string | null) => {
    setActiveFileId(id);
    void writeActiveFileId(id);
  };

  const persistFiles = (next: SavedDocument[]) => {
    const sorted = mergeDocumentLists(next, []);
    setFiles(sorted);
    void writeDocuments(sorted).catch(() => {
      showNotice('儲存失敗，請再試一次。');
    });
  };

  const commitDocument = (doc: SavedDocument) => {
    setFiles((prev) => {
      const next = mergeDocumentLists([doc, ...prev.filter((item) => item.id !== doc.id)], []);
      void writeDocuments(next).catch(() => {
        showNotice('儲存失敗，請再試一次。');
      });
      return next;
    });
    persistActive(doc.id);
    const handle = folderRef.current;
    if (handle) void writeDocToFolder(handle, doc);
  };

  const applyDocument = (item: SavedDocument) => {
    const next = normalizeSavedDocument(item) || item;
    setAppliedFormatId(null);
    setStyleId(next.styleId);
    setCustom(normalizeCustom(next.custom));
    setData(normalizeDocData(next.data));
    persistActive(next.id);
    setLibraryOpen(false);
    setStep('studio');
  };

  const saveNamed = (name: string, asNew: boolean) => {
    const resolvedStyle = styleId || 'classic';
    if (!styleId) {
      const meta = STYLE_LIST.find((item) => item.id === resolvedStyle);
      setStyleId(resolvedStyle);
      if (meta) {
        setCustom((prev) => ({
          ...prev,
          accent: meta.accent,
          paper: meta.paper,
          ink: meta.ink,
        }));
      }
    }
    const label = name.trim() || defaultDocumentName(data);
    const reuseId = !asNew && activeFileId ? activeFileId : undefined;
    const doc = createSavedDocument(label, resolvedStyle, custom, data, reuseId);
    commitDocument(doc);
    const handle = folderRef.current;
    if (handle) {
      showNotice(`已儲存「${doc.name}」· ${styleNameOf(doc.styleId)} 模版與內容 · ${handle.name}`);
    } else {
      showNotice(`已存到本機「${doc.name}」· ${styleNameOf(doc.styleId)} 模版與內容`);
    }
    setLibraryOpen(true);
  };

  const openFile = (id: string) => {
    const item = files.find((file) => file.id === id);
    if (!item) {
      showNotice('找不到這份文件，請改用「打開本機檔案」。');
      return;
    }
    applyDocument(item);
    showNotice(`已打開「${item.name}」`);
  };

  const deleteFile = (id: string) => {
    const item = files.find((file) => file.id === id);
    if (!item) return;
    if (!window.confirm(`刪除「${item.name}」？此操作不能復原。`)) return;
    persistFiles(files.filter((file) => file.id !== id));
    if (folderRef.current) void removeDocFromFolder(folderRef.current, item);
    if (activeFileId === id) persistActive(null);
  };

  const newDoc = () => {
    persistActive(null);
    setData(createFreshDoc(data));
    setLibraryOpen(false);
    if (styleId) setStep('studio');
  };

  const connectFolder = async () => {
    try {
      const handle = await pickFolder();
      if (!handle) return;
      folderRef.current = handle;
      setFolderName(handle.name);
      const remote = await readDocsFromFolder(handle);
      const merged = mergeDocumentLists(files, remote);
      persistFiles(merged);
      for (const doc of merged) await writeDocToFolder(handle, doc);
      showNotice(`已連結「${handle.name}」。之後儲存會同時寫入此資料夾（可選 Google Drive）。`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error(err);
      window.alert('無法連結資料夾。請確認已允許存取。');
    }
  };

  const disconnectFolder = async () => {
    folderRef.current = null;
    setFolderName(null);
    await forgetFolder();
  };

  const currentSnapshot = () => {
    const resolvedStyle = styleId || 'classic';
    const existing = activeFileId ? files.find((item) => item.id === activeFileId) : null;
    return existing
      ? { ...existing, data, custom, styleId: resolvedStyle, savedAt: new Date().toISOString() }
      : createSavedDocument(defaultDocumentName(data), resolvedStyle, custom, data);
  };

  const downloadCurrent = () => {
    const doc = currentSnapshot();
    commitDocument(doc);
    void saveJsonToDisk(`${doc.name}.json`, toFilePayload(doc))
      .then((how) => {
        showNotice(
          how === 'picked'
            ? `已寫入本機「${doc.name}」。可用右上角「打開本機檔案」載入。`
            : `已下載「${doc.name}」。請打開下載資料夾裡的 JSON，不要選桌面上的空檔。`,
        );
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        showNotice('無法寫入本機檔案。');
      });
  };

  const importFile = async (file: File) => {
    try {
      if (!file.size) {
        showNotice('這個檔是空的。請再按一次「存到本機」，改用下載出來的 JSON。');
        return;
      }
      const parsed = await readDocumentFromFile(file);
      if (!parsed) {
        showNotice('打不開：請選澳門單據存出的 JSON 檔。');
        return;
      }
      commitDocument(parsed);
      applyDocument(parsed);
      showNotice(`已打開「${parsed.name}」· ${styleNameOf(parsed.styleId)}`);
    } catch {
      showNotice('讀取檔案失敗。');
    }
  };

  const importDroppedFiles = (list: FileList | File[] | null) => {
    const file = [...(list || [])].find((item) => /\.json$/i.test(item.name) || item.type.includes('json'));
    if (file) void importFile(file);
    else if (list && list.length) showNotice('請拖入澳門單據存出的 JSON 檔。');
  };

  const pickStyle = (id: StyleId) => {
    const meta = STYLE_LIST.find((s) => s.id === id);
    setAppliedFormatId(null);
    setStyleId(id);
    if (meta) {
      setCustom((prev) => ({
        ...prev,
        accent: meta.accent,
        paper: meta.paper,
        ink: meta.ink,
      }));
    }
  };

  const persistFormats = (next: SavedFormat[]) => {
    setFormats(next);
    writeSavedFormats(next);
  };

  const applyFormat = (id: string) => {
    const item = formats.find((f) => f.id === id);
    if (!item) return;
    setAppliedFormatId(item.id);
    setStyleId(item.styleId);
    setCustom(normalizeCustom(item.custom));
  };

  const saveFormat = (name: string) => {
    if (!styleId) return;
    persistFormats([createSavedFormat(name, styleId, custom), ...formats]);
  };

  const deleteFormat = (id: string) => {
    persistFormats(formats.filter((item) => item.id !== id));
    if (appliedFormatId === id) setAppliedFormatId(null);
  };

  const enterStudio = (id?: StyleId) => {
    const next = id || styleId;
    if (!next) return;
    if (id) pickStyle(id);
    setStep('studio');
  };

  const activeFile = files.find((item) => item.id === activeFileId) || null;

  if (!unlocked) {
    return (
      <Gate
        onUnlock={() => {
          try {
            sessionStorage.setItem(GATE_KEY, 'ok');
          } catch {
            /* ignore */
          }
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[#e6e6e6] text-neutral-900"
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        importDroppedFiles(e.dataTransfer.files);
      }}
    >
      <input
        id="macau-docs-open-file"
        type="file"
        accept=".json,application/json,text/plain,*/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = '';
        }}
      />
      <header className="sticky top-0 z-20 border-b border-neutral-300 bg-[#efefef]/95 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <button type="button" onClick={() => setStep('gallery')} className="text-left">
            <div className="text-[10px] tracking-[0.24em] uppercase text-neutral-500">Macau SAR</div>
            <div className="quo-mark text-[20px]">Quo-Mo</div>
          </button>
          <div className="hidden md:block text-[12px] text-neutral-500">
            電子報價單 · 發票 · 收據　同一風格成套輸出
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="macau-docs-open-file"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-2 text-[13px] text-neutral-800 cursor-pointer"
            >
              打開本機檔案
            </label>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-2 text-[13px] text-neutral-800"
            >
              <FolderClosed className="w-4 h-4" />
              文件
            </button>
            {step === 'gallery' && (
              <button
                type="button"
                disabled={!styleId}
                onClick={() => enterStudio()}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-[13px] disabled:opacity-40"
              >
                填寫內容
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {step === 'gallery' ? (
        <main className="max-w-[1600px] mx-auto px-5 py-8">
          <div className="max-w-2xl mb-8">
            <h1 className="quo-mark text-[42px] md:text-[56px] text-neutral-900">
              Quo Model
            </h1>
            <p className="text-neutral-500 mt-3 text-[15px] leading-relaxed">
              十款目前最常用的報價／發票排版。選定後，報價單、發票與收據自動共用同一風格，金額即時合計，可輸出 JPG 或 PDF。填好的單可存成文件，之後再開繼續改。
            </p>
          </div>
          <StyleGallery
            selected={styleId}
            custom={custom}
            onSelect={pickStyle}
            onEnter={enterStudio}
            formats={formats}
            appliedFormatId={appliedFormatId}
            onApplyFormat={applyFormat}
            onDeleteFormat={deleteFormat}
            files={files}
            activeFileId={activeFileId}
            onOpenFile={openFile}
            onDeleteFile={deleteFile}
          />
          {styleId && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => enterStudio()}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-6 py-3 text-[14px]"
              >
                使用「{STYLE_LIST.find((s) => s.id === styleId)?.name}」開始填寫
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
        ) : (
          <Studio
            styleId={styleId || 'classic'}
            custom={custom}
            data={data}
            formats={formats}
            fileName={activeFile?.name || null}
            onOpenLibrary={() => setLibraryOpen(true)}
            onSave={() => saveNamed(activeFile?.name || defaultDocumentName(data), false)}
            onCustomChange={setCustom}
            onDataChange={setData}
            onChangeStyle={() => setStep('gallery')}
            onSaveFormat={saveFormat}
            onApplyFormat={applyFormat}
            onDeleteFormat={deleteFormat}
          />
        )}

      <LibraryPanel
        open={libraryOpen}
        files={files}
        activeFileId={activeFileId}
        currentName={activeFile?.name || defaultDocumentName(data)}
        folderName={folderName}
        folderSupported={canPickFolder()}
        onClose={() => setLibraryOpen(false)}
        onSave={(name) => saveNamed(name, false)}
        onSaveAs={(name) => saveNamed(name, true)}
        onOpen={openFile}
        onDelete={deleteFile}
        onNew={newDoc}
        onPickFolder={() => void connectFolder()}
        onForgetFolder={() => void disconnectFolder()}
        onDownload={downloadCurrent}
      />
      {notice && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-[13px] text-white shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
