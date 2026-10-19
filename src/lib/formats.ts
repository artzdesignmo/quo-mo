import { addDaysISO, INVOICE_DUE_DAYS, newId, PAYMENT_METHODS, QUOTE_VALID_DAYS } from './money';
import { createDefaultDoc, emptyItem } from '../data/defaults';
import type { DocData, LayoutCustom, LineItem, SavedFormat, StyleId } from '../types/doc';
import { DEFAULT_CUSTOM } from '../data/styles';

const KEY = 'macau-docs-formats';

export function normalizeCustom(raw?: Partial<LayoutCustom> | null): LayoutCustom {
  const merged = { ...DEFAULT_CUSTOM, ...(raw || {}) };
  if (!raw?.labelLang && raw?.bilingual) merged.labelLang = 'both';
  if (merged.labelLang !== 'zh' && merged.labelLang !== 'en' && merged.labelLang !== 'both') {
    merged.labelLang = 'zh';
  }
  return merged;
}

function migrateSecondary(value?: string): string | undefined {
  if (value === 'Atelier da Praia') return 'Praia Design Studio';
  if (value === 'Café do Largo Limitada') return 'Largo Café Ltd.';
  return value;
}

function migrateValidUntil(issueDate: string, validUntil?: string): string {
  const next = addDaysISO(issueDate, QUOTE_VALID_DAYS);
  if (!validUntil) return next;
  if (validUntil === addDaysISO(issueDate, 30)) return next;
  return validUntil;
}

function migrateDueDate(issueDate: string, dueDate?: string): string {
  const next = addDaysISO(issueDate, INVOICE_DUE_DAYS);
  if (!dueDate) return next;
  if (dueDate === addDaysISO(issueDate, 14)) return next;
  return dueDate;
}

function normalizeLineItem(item: Partial<LineItem> | null | undefined): LineItem {
  const base = emptyItem();
  return {
    ...base,
    ...(item || {}),
    id: item?.id || base.id,
    details: Array.isArray(item?.details) ? item.details.map((row) => String(row ?? '')) : [],
  };
}

export function normalizeDocData(raw?: Partial<DocData> | null): DocData {
  const fallback = createDefaultDoc();
  if (!raw) return fallback;
  const seller = { ...fallback.seller, ...raw.seller };
  const buyer = { ...fallback.buyer, ...raw.buyer };
  return {
    ...fallback,
    ...raw,
    seller: {
      ...seller,
      nameSecondary: migrateSecondary(seller.nameSecondary) ?? seller.nameSecondary,
    },
    buyer: {
      ...buyer,
      nameSecondary: migrateSecondary(buyer.nameSecondary) ?? buyer.nameSecondary,
    },
    items: Array.isArray(raw.items) && raw.items.length ? raw.items.map(normalizeLineItem) : fallback.items,
    logoScale: typeof raw.logoScale === 'number' && raw.logoScale > 0 ? raw.logoScale : 100,
    chopScale: typeof raw.chopScale === 'number' && raw.chopScale > 0 ? raw.chopScale : 100,
    chopX: typeof raw.chopX === 'number' ? raw.chopX : 0,
    chopY: typeof raw.chopY === 'number' ? raw.chopY : 0,
    validUntil: migrateValidUntil(raw.issueDate || fallback.issueDate, raw.validUntil),
    dueDate: migrateDueDate(raw.issueDate || fallback.issueDate, raw.dueDate),
    paymentMethod: (PAYMENT_METHODS as readonly string[]).includes(raw.paymentMethod || '')
      ? raw.paymentMethod as string
      : '銀行轉賬',
  };
}

export function readSavedFormats(): SavedFormat[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedFormat[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      custom: normalizeCustom(item.custom),
    }));
  } catch {
    return [];
  }
}

export function writeSavedFormats(list: SavedFormat[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function createSavedFormat(name: string, styleId: StyleId, custom: LayoutCustom): SavedFormat {
  return {
    id: newId('fmt'),
    name: name.trim() || '未命名格式',
    savedAt: new Date().toISOString(),
    styleId,
    custom: normalizeCustom(custom),
  };
}
