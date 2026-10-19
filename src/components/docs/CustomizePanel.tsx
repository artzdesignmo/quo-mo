import { useState } from 'react';
import { FONT_PRESET_LABEL, LAYOUT_LABEL } from '../../data/styles';
import type { LayoutCustom, SavedFormat } from '../../types/doc';

type Props = {
  custom: LayoutCustom;
  onChange: (next: LayoutCustom) => void;
  open: boolean;
  formats: SavedFormat[];
  onSaveFormat: (name: string) => void;
  onApplyFormat: (id: string) => void;
  onDeleteFormat: (id: string) => void;
};

const ACCENTS = ['#2563eb', '#1e3a8a', '#047857', '#e11d48', '#dc2626', '#111827', '#b42318', '#6d28d9'];
const PAPERS = ['#ffffff', '#fafafa', '#f8fafc', '#fffbeb', '#111111'];

export default function CustomizePanel({
  custom,
  onChange,
  open,
  formats,
  onSaveFormat,
  onApplyFormat,
  onDeleteFormat,
}: Props) {
  const [name, setName] = useState('');
  if (!open) return null;

  const set = <K extends keyof LayoutCustom>(key: K, value: LayoutCustom[K]) => {
    onChange({ ...custom, [key]: value });
  };

  return (
    <div className="rounded-xl border border-neutral-300 bg-white p-4 space-y-4 mb-4">
      <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">自定義排版</div>

      <div>
        <div className="text-[11px] text-neutral-500 mb-2">版式骨架</div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(LAYOUT_LABEL) as Array<LayoutCustom['layout']>).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => set('layout', id)}
              className={`text-[12px] rounded-lg px-2 py-2 border ${
                custom.layout === id ? 'border-neutral-900 text-neutral-900' : 'border-neutral-300 text-neutral-500'
              }`}
            >
              {LAYOUT_LABEL[id]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-500 mb-2">字體</div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(FONT_PRESET_LABEL) as Array<LayoutCustom['fontPreset']>).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => set('fontPreset', id)}
              className={`text-[12px] rounded-lg px-2 py-2 border ${
                custom.fontPreset === id ? 'border-neutral-900 text-neutral-900' : 'border-neutral-300 text-neutral-500'
              }`}
            >
              {FONT_PRESET_LABEL[id]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-500 mb-2">疏密度</div>
        <div className="flex gap-2">
          {([
            ['compact', '緊湊'],
            ['regular', '標準'],
            ['airy', '疏朗'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => set('density', id)}
              className={`flex-1 text-[12px] rounded-lg px-2 py-2 border ${
                custom.density === id ? 'border-neutral-900 text-neutral-900' : 'border-neutral-300 text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-500 mb-2">主色</div>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('accent', c)}
              className="w-6 h-6 rounded-full border border-neutral-300"
              style={{ background: c, outline: custom.accent === c ? '2px solid #171717' : undefined }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={custom.accent}
            onChange={(e) => set('accent', e.target.value)}
            className="w-6 h-6 rounded-full bg-transparent"
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-500 mb-2">紙張色</div>
        <div className="flex flex-wrap gap-2">
          {PAPERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('paper', c)}
              className="w-6 h-6 rounded-full border border-neutral-300"
              style={{ background: c, outline: custom.paper === c ? '2px solid #171717' : undefined }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={custom.paper}
            onChange={(e) => set('paper', e.target.value)}
            className="w-6 h-6 rounded-full bg-transparent"
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-500 mb-2">單據文字</div>
        <div className="flex gap-2">
          {([
            ['zh', '中文'],
            ['en', '英文'],
            ['both', '中英'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...custom, labelLang: id, bilingual: id !== 'zh' })}
              className={`flex-1 text-[12px] rounded-lg px-2 py-2 border ${
                (custom.labelLang || 'zh') === id ? 'border-neutral-900 text-neutral-900' : 'border-neutral-300 text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between text-[12px] text-neutral-700">
        顯示印章欄
        <input type="checkbox" checked={custom.showChop} onChange={(e) => set('showChop', e.target.checked)} />
      </label>
      <label className="flex items-center justify-between text-[12px] text-neutral-700">
        顯示金額大寫
        <input type="checkbox" checked={custom.showChineseAmount} onChange={(e) => set('showChineseAmount', e.target.checked)} />
      </label>
      <label className="flex items-center justify-between text-[12px] text-neutral-700">
        顯示報價有效期
        <input type="checkbox" checked={custom.showValidUntil} onChange={(e) => set('showValidUntil', e.target.checked)} />
      </label>

      <div className="border-t border-neutral-200 pt-3 space-y-2">
        <div className="text-[11px] text-neutral-500">儲存此格式，下次直接套用</div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-neutral-50 border border-neutral-300 px-3 py-2 text-[13px] outline-none focus:border-neutral-800"
            placeholder="例如：公司常用藍"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              onSaveFormat(name);
              setName('');
            }}
            className="rounded-lg bg-neutral-900 text-white px-3 py-2 text-[12px] whitespace-nowrap"
          >
            儲存
          </button>
        </div>
        {formats.length > 0 && (
          <ul className="space-y-1">
            {formats.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2 py-1.5">
                <span className="flex-1 truncate text-[12px]">{item.name}</span>
                <button type="button" className="text-[11px] text-neutral-800" onClick={() => onApplyFormat(item.id)}>
                  套用
                </button>
                <button type="button" className="text-[11px] text-red-600" onClick={() => onDeleteFormat(item.id)}>
                  刪除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
