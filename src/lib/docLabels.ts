import type { DocType } from '../types/doc';

export type LabelLang = 'zh' | 'en' | 'both';

const DOC_TITLE: Record<DocType, { zh: string; en: string }> = {
  quotation: { zh: '報價單', en: 'Quotation' },
  invoice: { zh: '發票', en: 'Invoice' },
  receipt: { zh: '收據', en: 'Receipt' },
};

const GRAND: Record<DocType, { zh: string; en: string }> = {
  quotation: { zh: '合計', en: 'Total' },
  invoice: { zh: '應付', en: 'Total' },
  receipt: { zh: '實收', en: 'Total' },
};

const LABELS = {
  no: { zh: '編號', en: 'No.' },
  date: { zh: '日期', en: 'Date' },
  valid: { zh: '有效', en: 'Valid' },
  due: { zh: '期限', en: 'Due' },
  address: { zh: '地址', en: 'Address' },
  tel: { zh: '電話', en: 'Tel' },
  issued: { zh: '發出', en: 'Issued' },
  validUntil: { zh: '有效期至', en: 'Valid until' },
  dueDate: { zh: '付款期限', en: 'Due date' },
  receivedDate: { zh: '收款日期', en: 'Date received' },
  from: { zh: '發出方', en: 'From' },
  client: { zh: '客戶', en: 'Bill to' },
  payer: { zh: '付款方', en: 'Received from' },
  bizReg: { zh: '商業登記', en: 'Business reg.' },
  taxNo: { zh: '納稅人編號', en: 'Tax no.' },
  footerReg: { zh: '登記', en: 'Reg.' },
  item: { zh: '項目', en: 'Description' },
  qty: { zh: '數量', en: 'Qty' },
  unitPrice: { zh: '單價', en: 'Unit' },
  amount: { zh: '金額', en: 'Amount' },
  amountWords: { zh: '金額大寫', en: 'Amount in words' },
  payMethod: { zh: '收款方式', en: 'Payment' },
  notes: { zh: '備註', en: 'Notes' },
  payTerms: { zh: '付款條件', en: 'Payment terms' },
  bank: { zh: '轉賬資料', en: 'Bank details' },
  payInfo: { zh: '付款資料', en: 'Payment details' },
  subtotal: { zh: '小計', en: 'Subtotal' },
  discount: { zh: '折扣', en: 'Discount' },
  tax: { zh: '稅項', en: 'Tax' },
  signIssuer: { zh: '發出方簽署／蓋章', en: 'Issued by' },
  signClient: { zh: '客戶確認', en: 'Confirmed by' },
  signReceive: { zh: '收件確認', en: 'Received by' },
  chopReceipt: { zh: '收款印', en: 'Stamp' },
  chopCompany: { zh: '公司印章', en: 'Stamp' },
  thanks: { zh: '謝謝', en: 'Thank you' },
} as const;

export type SheetLabel = keyof typeof LABELS;

function pair(zh: string, en: string, lang: LabelLang): string {
  if (lang === 'en') return en;
  if (lang === 'both') return `${zh} ${en}`;
  return zh;
}

export function sheetLabel(key: SheetLabel, lang: LabelLang): string {
  const item = LABELS[key];
  return pair(item.zh, item.en, lang);
}

export function labeledValue(key: SheetLabel, lang: LabelLang, value: string): string {
  const name = sheetLabel(key, lang);
  return lang === 'en' ? `${name} ${value}` : `${name}：${value}`;
}

export function docTitle(docType: DocType, lang: LabelLang): string {
  const item = DOC_TITLE[docType];
  return pair(item.zh, item.en, lang);
}

export function grandLabel(docType: DocType, lang: LabelLang): string {
  const item = GRAND[docType];
  return pair(item.zh, item.en, lang);
}

export function buyerLabel(docType: DocType, lang: LabelLang): string {
  return sheetLabel(docType === 'receipt' ? 'payer' : 'client', lang);
}

export function sellerLabel(lang: LabelLang): string {
  return sheetLabel('from', lang);
}

export function dateLineLabel(docType: DocType, lang: LabelLang): SheetLabel {
  if (docType === 'quotation') return 'validUntil';
  if (docType === 'invoice') return 'dueDate';
  return 'receivedDate';
}
