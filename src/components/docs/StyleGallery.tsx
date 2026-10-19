import { STYLE_LIST } from '../../data/styles';
import { createDefaultDoc } from '../../data/defaults';
import type { LayoutCustom, SavedDocument, SavedFormat, StyleId } from '../../types/doc';
import { fileLabel, styleNameOf } from '../../lib/documents';
import DocumentSheet from './DocumentSheet';

type Props = {
  selected: StyleId | null;
  custom: LayoutCustom;
  onSelect: (id: StyleId) => void;
  onEnter: (id: StyleId) => void;
  formats: SavedFormat[];
  appliedFormatId: string | null;
  onApplyFormat: (id: string) => void;
  onDeleteFormat: (id: string) => void;
  files: SavedDocument[];
  activeFileId: string | null;
  onOpenFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
};

const previewDoc = createDefaultDoc();

export default function StyleGallery({
  selected,
  custom,
  onSelect,
  onEnter,
  formats,
  appliedFormatId,
  onApplyFormat,
  onDeleteFormat,
  files,
  activeFileId,
  onOpenFile,
  onDeleteFile,
}: Props) {
  return (
    <div className="space-y-10">
      {files.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg text-neutral-900">已存單據</h2>
            <p className="text-[13px] text-neutral-500 mt-1">打開後可繼續改內容、換風格，再輸出 JPG 或 PDF。</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {files.map((item) => {
              const active = activeFileId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-white px-3 py-3 flex items-center gap-3 ${
                    active ? 'border-neutral-900 ring-2 ring-neutral-900/15' : 'border-neutral-300'
                  }`}
                >
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => onOpenFile(item.id)}>
                    <div className="font-medium truncate">{fileLabel(item)}</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      {styleNameOf(item.styleId)} · {item.data.buyer.name || '未填客戶'}
                    </div>
                  </button>
                  <button type="button" className="text-[11px] text-neutral-800" onClick={() => onOpenFile(item.id)}>
                    打開
                  </button>
                  <button type="button" className="text-[11px] text-red-600" onClick={() => onDeleteFile(item.id)}>
                    刪除
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {formats.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg text-neutral-900">已儲存格式</h2>
            <p className="text-[13px] text-neutral-500 mt-1">下次直接套用你調好的排版、主色與顯示項目。</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {formats.map((item) => {
              const meta = STYLE_LIST.find((s) => s.id === item.styleId);
              const active = appliedFormatId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-white px-3 py-3 flex items-center gap-3 ${
                    active ? 'border-neutral-900 ring-2 ring-neutral-900/15' : 'border-neutral-300'
                  }`}
                >
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => onApplyFormat(item.id)}>
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{meta?.name || item.styleId}</div>
                  </button>
                  <button type="button" className="text-[11px] text-neutral-800" onClick={() => onApplyFormat(item.id)}>
                    套用
                  </button>
                  <button type="button" className="text-[11px] text-red-600" onClick={() => onDeleteFormat(item.id)}>
                    刪除
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <p className="text-[13px] text-neutral-500 mb-4">單擊選取，雙擊進入填寫。</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {STYLE_LIST.map((style) => {
            const active = selected === style.id && !appliedFormatId;
            return (
              <button
                key={style.id}
                type="button"
                aria-label={style.name}
                onClick={() => onSelect(style.id)}
                onDoubleClick={() => onEnter(style.id)}
                className={`text-left group rounded-xl overflow-hidden border bg-white transition ${
                  active ? 'border-neutral-900 ring-2 ring-neutral-900/15' : 'border-neutral-300 hover:border-neutral-500'
                }`}
              >
                <div className="relative h-[230px] overflow-hidden bg-[#d8d8d8]">
                  <div
                    className="absolute left-1/2 top-5 origin-top pointer-events-none"
                    style={{ transform: 'translateX(-50%) scale(0.25)' }}
                  >
                    <DocumentSheet
                      data={previewDoc}
                      docType="quotation"
                      styleId={style.id}
                      custom={style.id === 'custom' ? custom : { ...custom, accent: style.accent, paper: style.paper, ink: style.ink }}
                    />
                  </div>
                </div>
                <div className="px-3 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-neutral-900">{style.name}</div>
                    <div className="text-[10px] tracking-[0.16em] uppercase text-neutral-500">{style.tag}</div>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 leading-snug">{style.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
