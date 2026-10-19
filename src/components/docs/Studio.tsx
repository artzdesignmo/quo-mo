import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Image, FileText, Layers, Loader2, Save, FolderClosed } from 'lucide-react';
import type { DocData, DocType, LayoutCustom, SavedFormat, StyleId } from '../../types/doc';
import { STYLE_LIST } from '../../data/styles';
import { exportJpg, exportPdf, fileBase } from '../../lib/exportDoc';
import DocumentSheet from './DocumentSheet';
import EditorForm from './EditorForm';
import CustomizePanel from './CustomizePanel';
import { getDict, type Lang } from '../../i18n';

type Props = {
  lang: Lang;
  styleId: StyleId;
  custom: LayoutCustom;
  data: DocData;
  formats: SavedFormat[];
  fileName: string | null;
  onOpenLibrary: () => void;
  onSave: () => void;
  onCustomChange: (next: LayoutCustom) => void;
  onDataChange: (next: DocData) => void;
  onChangeStyle: () => void;
  onSaveFormat: (name: string) => void;
  onApplyFormat: (id: string) => void;
  onDeleteFormat: (id: string) => void;
};

export default function Studio({
  lang,
  styleId,
  custom,
  data,
  formats,
  fileName,
  onOpenLibrary,
  onSave,
  onCustomChange,
  onDataChange,
  onChangeStyle,
  onSaveFormat,
  onApplyFormat,
  onDeleteFormat,
}: Props) {
  const t = getDict(lang);
  const DOCS: { id: DocType; label: string }[] = [
    { id: 'quotation', label: t.quotation },
    { id: 'invoice', label: t.invoice },
    { id: 'receipt', label: t.receipt },
  ];
  const [docType, setDocType] = useState<DocType>('quotation');
  const [scale, setScale] = useState(0.55);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(styleId === 'custom');
  const [captureType, setCaptureType] = useState<DocType>('quotation');
  const frameRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const style = STYLE_LIST.find((s) => s.id === styleId);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      const w = frame.clientWidth - 32;
      setScale(Math.min(1, Math.max(0.28, w / 794)));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(frame);
    return () => obs.disconnect();
  }, []);

  const runExport = async (kind: 'jpg' | 'pdf' | 'series') => {
    const types: DocType[] = kind === 'series' ? ['quotation', 'invoice', 'receipt'] : [docType];
    setBusy(kind);
    try {
      for (const type of types) {
        flushSync(() => {
          setCaptureType(type);
          if (kind === 'series') setDocType(type);
        });
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const el = exportRef.current;
        if (!el) continue;
        if (kind === 'jpg') {
          await exportJpg(el, `${fileBase(type, data.seriesId)}.jpg`);
        } else {
          await exportPdf(el, `${fileBase(type, data.seriesId)}.pdf`);
        }
      }
    } catch (err) {
      console.error(err);
      window.alert(t.exportFailed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid lg:grid-cols-[360px_1fr] min-h-[calc(100vh-64px)] bg-[#d8d8d8] text-neutral-900">
      <aside className="border-r border-neutral-300 bg-[#ececec] overflow-y-auto p-5">
        <div className="sticky top-0 z-10 -mx-5 px-5 pt-1 pb-4 bg-[#ececec]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] tracking-[0.16em] uppercase text-neutral-500">{t.styleSeries}</div>
              <div className="text-neutral-900 text-lg">{style?.name}</div>
            </div>
            <button type="button" onClick={onChangeStyle} className="text-[12px] text-neutral-600 hover:text-neutral-900">
              {t.changeStyle}
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={onSave}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-[12px] text-white"
            >
              <Save className="w-3.5 h-3.5" />
              {fileName ? t.save : t.saveAsDoc}
            </button>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[12px] text-neutral-800"
            >
              <FolderClosed className="w-3.5 h-3.5" />
              {t.files}
            </button>
          </div>
          {fileName && (
            <div className="mb-3 text-[11px] text-neutral-500 truncate" title={fileName}>
              {t.currentFile}：{fileName}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[12px] text-neutral-700 hover:border-neutral-800"
          >
            {showCustom ? t.hideLayoutSettings : t.adjustLayout}
          </button>
        </div>
        <CustomizePanel
          lang={lang}
          custom={custom}
          onChange={onCustomChange}
          open={showCustom || styleId === 'custom'}
          formats={formats}
          onSaveFormat={onSaveFormat}
          onApplyFormat={onApplyFormat}
          onDeleteFormat={onDeleteFormat}
        />
        <div className="mt-2">
          <EditorForm lang={lang} data={data} onChange={onDataChange} />
        </div>
      </aside>

      <section className="bg-[#d2d2d2] flex flex-col min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-neutral-300 bg-[#e4e4e4]">
          <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-white p-1 border border-neutral-300">
            {DOCS.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setDocType(doc.id)}
                className={`px-4 py-1.5 rounded-full text-[13px] ${
                  docType === doc.id ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                }`}
              >
                {doc.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full bg-white p-1 border border-neutral-300">
            {([
              ['zh', '中'],
              ['en', 'EN'],
              ['both', '中EN'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onCustomChange({ ...custom, labelLang: id, bilingual: id !== 'zh' })}
                className={`px-3 py-1.5 rounded-full text-[12px] ${
                  (custom.labelLang || 'zh') === id ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => runExport('jpg')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-neutral-300 px-3 py-2 text-[12px] text-neutral-800 disabled:opacity-50"
            >
              {busy === 'jpg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
              JPG
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => runExport('pdf')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-neutral-300 px-3 py-2 text-[12px] text-neutral-800 disabled:opacity-50"
            >
              {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              PDF
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => runExport('series')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-[12px] text-white disabled:opacity-50"
            >
              {busy === 'series' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              {t.exportSeries}
            </button>
          </div>
        </div>

        <div ref={frameRef} className="flex-1 overflow-auto p-4 md:p-8">
          <div
            className="mx-auto"
            style={{
              width: 794 * scale,
              height: 1123 * scale,
            }}
          >
            <div
              style={{
                width: 794,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                boxShadow: '0 18px 50px rgba(0,0,0,0.18)',
              }}
            >
              <DocumentSheet data={data} docType={docType} styleId={styleId} custom={custom} />
            </div>
          </div>
          <p className="text-center text-[11px] text-neutral-500 mt-6">
            {t.docNumberHint}
          </p>
        </div>
      </section>

      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: -2000,
          top: 0,
          width: 794,
          pointerEvents: 'none',
          color: '#171717',
          background: '#ffffff',
        }}
      >
        <div ref={exportRef} style={{ color: '#171717', background: '#ffffff' }}>
          <DocumentSheet data={data} docType={captureType} styleId={styleId} custom={custom} />
        </div>
      </div>
    </div>
  );
}
