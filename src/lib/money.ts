import type { LineItem, Totals } from '../types/doc';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineAmount(item: LineItem): number {
  return round2((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
}

export function computeTotals(
  items: LineItem[],
  discount: number,
  discountType: 'amount' | 'percent',
  taxRate: number,
): Totals {
  const subtotal = round2(items.reduce((sum, item) => sum + lineAmount(item), 0));
  const discountValue =
    discountType === 'percent'
      ? round2(subtotal * (Number(discount) || 0) / 100)
      : round2(Number(discount) || 0);
  const taxable = round2(Math.max(0, subtotal - discountValue));
  const tax = round2(taxable * (Number(taxRate) || 0) / 100);
  const total = round2(taxable + tax);
  return { subtotal, discountValue, taxable, tax, total };
}

export function formatMoney(amount: number, currency: string = 'MOP'): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const isInt = Math.abs(n - Math.round(n)) < 0.0000001;
  const formatted = n.toLocaleString('zh-MO', {
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

const DIGITS = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
const SMALL_UNITS = ['', '拾', '佰', '仟'];

function fourDigits(n: number): string {
  const s = n.toString().padStart(4, '0');
  let out = '';
  let pendingZero = false;
  for (let i = 0; i < 4; i += 1) {
    const d = Number(s[i]);
    const unit = SMALL_UNITS[3 - i];
    if (d === 0) {
      pendingZero = out.length > 0;
      continue;
    }
    if (pendingZero) out += '零';
    pendingZero = false;
    out += DIGITS[d] + unit;
  }
  return out;
}

function intToChinese(n: number): string {
  if (n === 0) return '零';
  const yi = Math.floor(n / 100000000);
  const wan = Math.floor((n % 100000000) / 10000);
  const rest = n % 10000;
  let out = '';
  if (yi) out += fourDigits(yi) + '億';
  if (wan) {
    if (yi && wan < 1000) out += '零';
    out += fourDigits(wan) + '萬';
  } else if (yi && rest) {
    out += '零';
  }
  if (rest) {
    if ((yi || wan) && rest < 1000) out += '零';
    out += fourDigits(rest);
  }
  return out;
}

export function amountToChinese(amount: number, currencyName = '澳門元'): string {
  const n = round2(amount);
  const negative = n < 0;
  const abs = Math.abs(n);
  const yuan = Math.floor(abs);
  const cents = Math.round((abs - yuan) * 100);
  const jiao = Math.floor(cents / 10);
  const fen = cents % 10;

  let body = intToChinese(yuan) + '圓';
  if (cents === 0) {
    body += '正';
  } else {
    if (jiao) body += DIGITS[jiao] + '角';
    else if (fen) body += '零';
    if (fen) body += DIGITS[fen] + '分';
  }
  return `${negative ? '負' : ''}${currencyName}${body}`;
}

export function currencyName(code: 'MOP' | 'HKD' | 'CNY'): string {
  if (code === 'HKD') return '港幣';
  if (code === 'CNY') return '人民幣';
  return '澳門元';
}

export function todayISO(): string {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const QUOTE_VALID_DAYS = 90;
export const INVOICE_DUE_DAYS = 30;
export const PAYMENT_METHODS = ['支票', '現金', '銀行轉賬'] as const;

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${y}年${m}月${d}日`;
}

export function newId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function makeSeriesId(): string {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return `${stamp}-${rand}`;
}

export function docNumber(seriesId: string, type: 'quotation' | 'invoice' | 'receipt'): string {
  const prefix = type === 'quotation' ? 'QT' : type === 'invoice' ? 'INV' : 'RC';
  return `${prefix}-${seriesId}`;
}
