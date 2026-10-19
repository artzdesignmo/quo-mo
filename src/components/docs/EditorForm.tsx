import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, Trash2, Upload, X } from 'lucide-react';
import { emptyItem } from '../../data/defaults';
import { addDaysISO, computeTotals, formatMoney, INVOICE_DUE_DAYS, PAYMENT_METHODS, QUOTE_VALID_DAYS } from '../../lib/money';
import type { DocData, Party } from '../../types/doc';

type Props = {
  data: DocData;
  onChange: (next: DocData) => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="block text-[11px] text-neutral-500 mb-1">{label}</span>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg bg-white border border-neutral-300 px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-800';

function sanitizeAmount(raw: string, integer?: boolean): string {
  let next = raw.replace(/[^\d.]/g, '');
  if (integer) return next.replace(/\./g, '');
  const dot = next.indexOf('.');
  if (dot === -1) return next;
  return `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, '')}`;
}

function toAmount(raw: string): number {
  if (!raw || raw === '.') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function AmountInput({
  value,
  onChange,
  integer,
}: {
  value: number;
  onChange: (n: number) => void;
  integer?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft !== null ? draft : String(value ?? 0);

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      className={inputClass}
      value={shown}
      onFocus={() => setDraft(String(value ?? 0))}
      onChange={(e) => {
        const next = sanitizeAmount(e.target.value, integer);
        setDraft(next);
        onChange(toAmount(next));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {label ? <span className="w-8 shrink-0 text-[11px] text-neutral-500">{label}</span> : null}
      <button
        type="button"
        className="rounded border border-neutral-300 p-1"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label={label ? `減少${label}` : '縮小'}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        className="flex-1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <button
        type="button"
        className="rounded border border-neutral-300 p-1"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label={label ? `增加${label}` : '放大'}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <span className="w-10 text-right text-[11px] text-neutral-500">
        {value}{suffix || ''}
      </span>
    </div>
  );
}

function Collapsible({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-neutral-300 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left"
      >
        <span className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">{title}</span>
        {!open && summary && (
          <span className="flex-1 truncate text-[13px] text-neutral-800">{summary}</span>
        )}
        {open && <span className="flex-1" />}
        <ChevronDown className={`w-4 h-4 text-neutral-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 pb-3 space-y-2 border-t border-neutral-200 pt-3">{children}</div>}
    </div>
  );
}

function PartyFields({
  party,
  extra,
  onChange,
}: {
  party: Party;
  extra?: boolean;
  onChange: (next: Party) => void;
}) {
  const set = (key: keyof Party, value: string) => onChange({ ...party, [key]: value });
  return (
    <>
      <Field label="名稱">
        <input className={inputClass} value={party.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="外文名稱">
        <input className={inputClass} value={party.nameSecondary} onChange={(e) => set('nameSecondary', e.target.value)} />
      </Field>
      <Field label="地址">
        <textarea
          className={`${inputClass} min-h-[64px] resize-y`}
          value={party.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="電話">
          <input className={inputClass} value={party.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="電郵">
          <input className={inputClass} value={party.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
      </div>
      {extra && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="商業登記編號">
            <input className={inputClass} value={party.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} />
          </Field>
          <Field label="納稅人編號">
            <input className={inputClass} value={party.taxNo} onChange={(e) => set('taxNo', e.target.value)} />
          </Field>
        </div>
      )}
    </>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function EditorForm({ data, onChange }: Props) {
  const totals = computeTotals(data.items, data.discount, data.discountType, data.taxRate);
  const set = <K extends keyof DocData>(key: K, value: DocData[K]) => onChange({ ...data, [key]: value });

  const updateItem = (id: string, patch: Partial<DocData['items'][number]>) => {
    set(
      'items',
      data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  return (
    <div className="space-y-5 pb-16">
      <Collapsible title="發出方" summary={data.seller.name}>
        <PartyFields extra party={data.seller} onChange={(seller) => set('seller', seller)} />
        <div className="space-y-2 pt-1">
          <Field label="標誌">
            {data.logoDataUrl ? (
              <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <img
                    src={data.logoDataUrl}
                    alt=""
                    style={{
                      height: Math.round(36 * Math.max(0.5, (data.logoScale || 100) / 100)),
                      width: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...data, logoDataUrl: '', logoScale: 100 })}
                    className="inline-flex items-center gap-1 text-[12px] text-neutral-600 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                    取消
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-neutral-300 p-1"
                    onClick={() => set('logoScale', Math.max(50, (data.logoScale || 100) - 10))}
                    aria-label="縮小標誌"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={50}
                    max={220}
                    step={5}
                    className="flex-1"
                    value={data.logoScale || 100}
                    onChange={(e) => set('logoScale', Number(e.target.value))}
                  />
                  <button
                    type="button"
                    className="rounded border border-neutral-300 p-1"
                    onClick={() => set('logoScale', Math.min(220, (data.logoScale || 100) + 10))}
                    aria-label="放大標誌"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-right text-[11px] text-neutral-500">{data.logoScale || 100}%</span>
                </div>
              </div>
            ) : (
              <label className={`${inputClass} flex items-center gap-2 cursor-pointer`}>
                <Upload className="w-3.5 h-3.5" />
                <span className="truncate">上傳標誌</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) onChange({ ...data, logoDataUrl: await readFile(file), logoScale: data.logoScale || 100 });
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </Field>
          <Field label="印章">
            <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-2 space-y-2">
              {data.chopDataUrl ? (
                <div className="flex items-center justify-between gap-2">
                  <img
                    src={data.chopDataUrl}
                    alt=""
                    style={{
                      height: Math.round(36 * Math.max(0.4, (data.chopScale || 100) / 100)),
                      width: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...data, chopDataUrl: '', chopScale: 100, chopX: 0, chopY: 0 })}
                    className="inline-flex items-center gap-1 text-[12px] text-neutral-600 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                    取消
                  </button>
                </div>
              ) : (
                <label className={`${inputClass} flex items-center gap-2 cursor-pointer`}>
                  <Upload className="w-3.5 h-3.5" />
                  <span className="truncate">上傳印章</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) set('chopDataUrl', await readFile(file));
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              <SliderRow
                label="大小"
                value={data.chopScale || 100}
                min={50}
                max={220}
                step={5}
                suffix="%"
                onChange={(n) => set('chopScale', n)}
              />
              <SliderRow
                label="左右"
                value={data.chopX || 0}
                min={-80}
                max={80}
                step={2}
                onChange={(n) => set('chopX', n)}
              />
              <SliderRow
                label="上下"
                value={data.chopY || 0}
                min={-80}
                max={80}
                step={2}
                onChange={(n) => set('chopY', n)}
              />
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-1 w-[84px]">
                  <span />
                  <button
                    type="button"
                    className="rounded border border-neutral-300 p-1 flex justify-center"
                    onClick={() => set('chopY', Math.max(-80, (data.chopY || 0) - 4))}
                    aria-label="上移印章"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <span />
                  <button
                    type="button"
                    className="rounded border border-neutral-300 p-1 flex justify-center"
                    onClick={() => set('chopX', Math.max(-80, (data.chopX || 0) - 4))}
                    aria-label="左移印章"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded border border-neutral-300 text-[10px] text-neutral-500"
                    onClick={() => onChange({ ...data, chopX: 0, chopY: 0 })}
                  >
                    置中
                  </button>
                  <button
                    type="button"
                    className="rounded border border-neutral-300 p-1 flex justify-center"
                    onClick={() => set('chopX', Math.min(80, (data.chopX || 0) + 4))}
                    aria-label="右移印章"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <span />
                  <button
                    type="button"
                    className="rounded border border-neutral-300 p-1 flex justify-center"
                    onClick={() => set('chopY', Math.min(80, (data.chopY || 0) + 4))}
                    aria-label="下移印章"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <span />
                </div>
                <span className="text-[11px] text-neutral-500">
                  {data.chopX || 0} / {data.chopY || 0}
                </span>
              </div>
            </div>
          </Field>
        </div>
      </Collapsible>

      <Collapsible title="客戶" summary={data.buyer.name}>
        <PartyFields party={data.buyer} onChange={(buyer) => set('buyer', buyer)} />
      </Collapsible>

      <div className="space-y-2">
        <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">單據資料</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="系列編號">
            <input className={inputClass} value={data.seriesId} onChange={(e) => set('seriesId', e.target.value)} />
          </Field>
          <Field label="貨幣">
            <select className={inputClass} value={data.currency} onChange={(e) => set('currency', e.target.value as DocData['currency'])}>
              <option value="MOP">MOP 澳門元</option>
              <option value="HKD">HKD 港幣</option>
              <option value="CNY">CNY 人民幣</option>
            </select>
          </Field>
          <Field label="發出日期">
            <input
              type="date"
              className={inputClass}
              value={data.issueDate}
              onChange={(e) => {
                const issueDate = e.target.value;
                onChange({
                  ...data,
                  issueDate,
                  validUntil: addDaysISO(issueDate, QUOTE_VALID_DAYS),
                  dueDate: addDaysISO(issueDate, INVOICE_DUE_DAYS),
                });
              }}
            />
          </Field>
          <Field label="報價有效期">
            <input type="date" className={inputClass} value={data.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
          </Field>
          <Field label="發票付款期限">
            <input type="date" className={inputClass} value={data.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
          <Field label="收據收款方式">
            <select
              className={inputClass}
              value={PAYMENT_METHODS.includes(data.paymentMethod as (typeof PAYMENT_METHODS)[number]) ? data.paymentMethod : '銀行轉賬'}
              onChange={(e) => set('paymentMethod', e.target.value)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">項目明細</div>
          <button
            type="button"
            onClick={() => set('items', [...data.items, emptyItem()])}
            className="text-[12px] text-neutral-800 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            新增項目
          </button>
        </div>
        {data.items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-neutral-300 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span>第 {index + 1} 項</span>
              <button
                type="button"
                onClick={() => set('items', data.items.filter((row) => row.id !== item.id))}
                className="text-neutral-500 hover:text-red-500"
                disabled={data.items.length <= 1}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              className={inputClass}
              placeholder="項目說明"
              value={item.description}
              onChange={(e) => updateItem(item.id, { description: e.target.value })}
            />
            <div className="space-y-1.5">
              {(item.details || []).map((row, detailIndex) => (
                <div key={`${item.id}-d-${detailIndex}`} className="flex items-center gap-2">
                  <input
                    className={`${inputClass} text-[12px] py-1.5`}
                    placeholder="細項（單上以小字顯示）"
                    value={row}
                    onChange={(e) => {
                      const next = [...(item.details || [])];
                      next[detailIndex] = e.target.value;
                      updateItem(item.id, { details: next });
                    }}
                  />
                  <button
                    type="button"
                    className="text-neutral-400 hover:text-red-500"
                    onClick={() => {
                      updateItem(item.id, {
                        details: (item.details || []).filter((_, i) => i !== detailIndex),
                      });
                    }}
                    aria-label="刪除細項"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateItem(item.id, { details: [...(item.details || []), ''] })}
                className="text-[12px] text-neutral-600 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                新增細項
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="數量">
                <AmountInput
                  integer
                  value={item.quantity}
                  onChange={(quantity) => updateItem(item.id, { quantity })}
                />
              </Field>
              <Field label="單價">
                <AmountInput
                  value={item.unitPrice}
                  onChange={(unitPrice) => updateItem(item.id, { unitPrice })}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">金額</div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="折扣">
            <AmountInput value={data.discount} onChange={(discount) => set('discount', discount)} />
          </Field>
          <Field label="折扣方式">
            <select
              className={inputClass}
              value={data.discountType}
              onChange={(e) => set('discountType', e.target.value as DocData['discountType'])}
            >
              <option value="amount">金額</option>
              <option value="percent">百分比</option>
            </select>
          </Field>
          <Field label="稅率 %">
            <AmountInput value={data.taxRate} onChange={(taxRate) => set('taxRate', taxRate)} />
          </Field>
        </div>
        <div className="rounded-xl bg-white border border-neutral-300 px-3 py-3 text-[13px] space-y-1">
          <div className="flex justify-between text-neutral-500">
            <span>小計</span>
            <span>{formatMoney(totals.subtotal, data.currency)}</span>
          </div>
          {totals.discountValue > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>折扣</span>
              <span>-{formatMoney(totals.discountValue, data.currency)}</span>
            </div>
          )}
          {data.taxRate > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>稅項</span>
              <span>{formatMoney(totals.tax, data.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-neutral-900 text-base pt-1">
            <span>合計</span>
            <span>{formatMoney(totals.total, data.currency)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[12px] tracking-[0.14em] uppercase text-neutral-500">條款</div>
        <Field label="備註">
          <textarea className={`${inputClass} min-h-[72px] resize-y`} value={data.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <Field label="付款條件">
          <input className={inputClass} value={data.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} />
        </Field>
        <Field label="轉賬資料">
          <input className={inputClass} value={data.bankInfo} onChange={(e) => set('bankInfo', e.target.value)} />
        </Field>
      </div>
    </div>
  );
}
