import { addDaysISO, makeSeriesId, newId, INVOICE_DUE_DAYS, QUOTE_VALID_DAYS, todayISO } from '../lib/money';
import type { DocData, LineItem, Party } from '../types/doc';

export function emptyParty(): Party {
  return {
    name: '',
    nameSecondary: '',
    address: '',
    phone: '',
    email: '',
    registrationNo: '',
    taxNo: '',
  };
}

export function emptyItem(): LineItem {
  return {
    id: newId('item'),
    description: '',
    quantity: 1,
    unit: '項',
    unitPrice: 0,
    details: [],
  };
}

export function createDefaultDoc(): DocData {
  const issueDate = todayISO();
  return {
    seriesId: makeSeriesId(),
    issueDate,
    dueDate: addDaysISO(issueDate, INVOICE_DUE_DAYS),
    validUntil: addDaysISO(issueDate, QUOTE_VALID_DAYS),
    currency: 'MOP',
    seller: {
      name: '南灣設計工作室',
      nameSecondary: 'Praia Design Studio',
      address: '澳門南灣大馬路 123 號 5 樓',
      phone: '+853 2833 0000',
      email: 'hello@praia.mo',
      registrationNo: 'SO-8821',
      taxNo: '12345678',
    },
    buyer: {
      name: '議事亭前地咖啡有限公司',
      nameSecondary: 'Largo Café Ltd.',
      address: '澳門議事亭前地 8 號',
      phone: '+853 2855 0000',
      email: 'studio@largo.mo',
      registrationNo: '',
      taxNo: '',
    },
    items: [
      {
        id: newId('item'),
        description: '品牌識別系統設計',
        quantity: 1,
        unit: '式',
        unitPrice: 8800,
        details: ['標誌', '色彩系統', '字體規範'],
      },
      {
        id: newId('item'),
        description: '菜單與包裝應用設計',
        quantity: 1,
        unit: '套',
        unitPrice: 4200,
        details: [],
      },
      {
        id: newId('item'),
        description: '店面招牌與櫥窗文字設計',
        quantity: 2,
        unit: '款',
        unitPrice: 1800,
        details: [],
      },
    ],
    discount: 0,
    discountType: 'amount',
    taxRate: 0,
    notes: '報價已含修改兩輪。超出範圍之加急、攝影或印刷製作另計。',
    paymentTerms: '確認後支付 50% 訂金，交付時結清餘款。',
    paymentMethod: '銀行轉賬',
    bankInfo: '中國銀行澳門分行　賬戶名：南灣設計工作室　賬號：0000-1234-5678',
    logoDataUrl: '',
    chopDataUrl: '',
    logoScale: 100,
    chopScale: 100,
    chopX: 0,
    chopY: 0,
  };
}

export function createFreshDoc(from?: DocData): DocData {
  const issueDate = todayISO();
  const next = createDefaultDoc();
  if (!from) return next;
  return {
    ...next,
    seriesId: makeSeriesId(),
    issueDate,
    dueDate: addDaysISO(issueDate, INVOICE_DUE_DAYS),
    validUntil: addDaysISO(issueDate, QUOTE_VALID_DAYS),
    seller: from.seller,
    currency: from.currency,
    paymentMethod: from.paymentMethod,
    paymentTerms: from.paymentTerms,
    bankInfo: from.bankInfo,
    logoDataUrl: from.logoDataUrl,
    chopDataUrl: from.chopDataUrl,
    logoScale: from.logoScale,
    chopScale: from.chopScale,
    chopX: from.chopX,
    chopY: from.chopY,
    buyer: emptyParty(),
    items: [emptyItem()],
    discount: 0,
    notes: '',
  };
}
