import { useEffect, useState } from 'react';
import { FolderOpen, HardDrive, Upload, Download, Plus, X } from 'lucide-react';
import type { SavedDocument } from '../../types/doc';
import { fileLabel, styleNameOf } from '../../lib/documents';

type Props = {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="flex-1 bg-black/25" aria-label="關閉文件庫" onClick={onClose} />
      <aside className="w-full max-w-md h-full bg-[#efefef] border-l border-neutral-300 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#efefef] border-b border-neutral-300 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[0.16em] uppercase text-neutral-500">文件庫</div>
            <div className="text-lg text-neutral-900">儲存與再開</div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section className="rounded-xl border border-neutral-300 bg-white p-4 space-y-3">
            <label className="block">
              <div className="text-[11px] text-neutral-500 mb-1.5">此份名稱</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：議事亭咖啡 品牌識別"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-[13px] bg-[#fafafa]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSave(name)}
                className="rounded-lg bg-neutral-900 text-white px-3 py-2 text-[13px]"
              >
                {activeFileId ? '儲存' : '存成文件'}
              </button>
              <button
                type="button"
                onClick={() => onSaveAs(name)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[13px]"
              >
                另存新檔
              </button>
            </div>
            <button
              type="button"
              onClick={onNew}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-400 px-3 py-2 text-[12px] text-neutral-700"
            >
              <Plus className="w-3.5 h-3.5" />
              開新單據（保留發出方）
            </button>
          </section>

          <section>
            <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500 mb-2">已存單據</div>
            {files.length === 0 ? (
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                還沒有存過。填好內容後按「存成文件」，之後可從這裡打開繼續改。
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
                            {styleNameOf(item.styleId)} · {item.data.buyer.name || '未填客戶'} · {formatSavedAt(item.savedAt)}
                          </div>
                        </button>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" className="text-[11px] text-neutral-800" onClick={() => onOpen(item.id)}>
                            打開
                          </button>
                          <button type="button" className="text-[11px] text-red-600" onClick={() => onDelete(item.id)}>
                            刪除
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
            <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">儲存位置</div>
            <p className="text-[13px] text-neutral-600 leading-relaxed">
              按儲存會記下已選模版與已填內容，之後可打開繼續改。預設存在這台電腦的瀏覽器；也可另存檔案，或同步到 Google Drive 資料夾。
            </p>
            {folderName ? (
              <div className="rounded-lg bg-[#f4f4f4] px-3 py-2 text-[12px] text-neutral-800">
                已同步資料夾：{folderName}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500">
                <HardDrive className="w-3.5 h-3.5" />
                目前：本機瀏覽器
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 text-white px-3 py-2 text-[13px]"
              >
                <Download className="w-3.5 h-3.5" />
                存到本機
              </button>
              <label
                htmlFor="macau-docs-open-file"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-900 bg-white px-3 py-2 text-[13px] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                打開本機檔案
              </label>
            </div>
            <p className="text-[12px] text-neutral-500 leading-relaxed">
              桌面上若是 0 KB 的空檔，請不要選它。請再按「存到本機」，然後打開下載資料夾裡的 JSON。
            </p>
            {folderSupported ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPickFolder}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-[12px]"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {folderName ? '更換 Drive／本機資料夾' : '同步 Google Drive 或本機資料夾'}
                </button>
                {folderName && (
                  <button type="button" onClick={onForgetFolder} className="rounded-lg px-3 py-2 text-[12px] text-neutral-600">
                    取消
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-neutral-500 leading-relaxed">
                此瀏覽器不能直接選資料夾。請用「存到本機」，再把 JSON 放進 Google Drive。
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
