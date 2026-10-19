import { useEffect, useState } from 'react';
import { FolderOpen, HardDrive, Upload, Download, Plus, X } from 'lucide-react';
import type { SavedDocument } from '../../types/doc';
import { fileLabel, styleNameOf } from '../../lib/documents';
import { getDict, type Lang } from '../../i18n';

type Props = {
  lang: Lang;
  open: boolean;
  files: SavedDocument[];
  activeFileId: string | null;
  currentName: string;
  folderName: string | null;
  folderSupported: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onSaveAs: (name: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onPickFolder: () => void;
  onForgetFolder: () => void;
  onDownload: () => void;
};

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-MO', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LibraryPanel({
  lang,
  open,
  files,
  activeFileId,
  currentName,
  folderName,
  folderSupported,
  onClose,
  onSave,
  onSaveAs,
  onOpen,
  onDelete,
  onNew,
  onPickFolder,
  onForgetFolder,
  onDownload,
}: Props) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const t = getDict(lang);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="flex-1 bg-black/25" aria-label={t.closeLibrary} onClick={onClose} />
      <aside className="w-full max-w-md h-full bg-[#efefef] border-l border-neutral-300 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#efefef] border-b border-neutral-300 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[0.16em] uppercase text-neutral-500">{t.library}</div>
            <div className="text-lg text-neutral-900">{t.saveAndReopen}</div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section className="rounded-xl border border-neutral-300 bg-white p-4 space-y-3">
            <label className="block">
              <div className="text-[11px] text-neutral-500 mb-1.5">{t.thisDocName}</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.docNamePlaceholder}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-[13px] bg-[#fafafa]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSave(name)}
                className="rounded-lg bg-neutral-900 text-white px-3 py-2 text-[13px]"
              >
                {activeFileId ? t.save : t.saveDoc}
              </button>
              <button
                type="button"
                onClick={() => onSaveAs(name)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[13px]"
              >
                {t.saveAsNew}
              </button>
            </div>
            <button
              type="button"
              onClick={onNew}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-400 px-3 py-2 text-[12px] text-neutral-700"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.newDocKeepIssuer}
            </button>
          </section>

          <section>
            <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500 mb-2">{t.savedDocs}</div>
            {files.length === 0 ? (
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                {t.noSavedYet}
              </p>
            ) : (
              <div className="space-y-2">
                {files.map((item) => {
                  const active = item.id === activeFileId;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border bg-white px-3 py-3 ${
                        active ? 'border-neutral-900' : 'border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" className="text-left min-w-0 flex-1" onClick={() => onOpen(item.id)}>
                          <div className="text-[13px] font-medium truncate">{fileLabel(item)}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {styleNameOf(item.styleId)} · {item.data.buyer.name || t.noClient} · {formatSavedAt(item.savedAt)}
                          </div>
                        </button>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" className="text-[11px] text-neutral-800" onClick={() => onOpen(item.id)}>
                            {t.open}
                          </button>
                          <button type="button" className="text-[11px] text-red-600" onClick={() => onDelete(item.id)}>
                            {t.delete}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-300 bg-white p-4 space-y-3">
            <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">{t.saveLocation}</div>
            <p className="text-[13px] text-neutral-600 leading-relaxed">
              {t.saveLocationHint}
            </p>
            {folderName ? (
              <div className="rounded-lg bg-[#f4f4f4] px-3 py-2 text-[12px] text-neutral-800">
                {t.syncedFolder}：{folderName}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500">
                <HardDrive className="w-3.5 h-3.5" />
                {t.currentBrowser}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 text-white px-3 py-2 text-[13px]"
              >
                <Download className="w-3.5 h-3.5" />
                {t.saveToLocal}
              </button>
              <label
                htmlFor="macau-docs-open-file"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-900 bg-white px-3 py-2 text-[13px] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {t.openLocalFile}
              </label>
            </div>
            <p className="text-[12px] text-neutral-500 leading-relaxed">
              {t.emptyFileHint}
            </p>
            {folderSupported ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPickFolder}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-[12px]"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {folderName ? t.changeDriveFolder : t.syncDriveHint}
                </button>
                {folderName && (
                  <button type="button" onClick={onForgetFolder} className="rounded-lg px-3 py-2 text-[12px] text-neutral-600">
                    {t.cancel}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-neutral-500 leading-relaxed">
                {t.noFolderSupport}
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
