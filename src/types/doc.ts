export type DocType = 'quotation' | 'invoice' | 'receipt';

export type StyleId =
  | 'classic'
  | 'clean'
  | 'compact'
  | 'sharp'
  | 'executive'
  | 'sidebar'
  | 'bold'
  | 'navy'
  | 'emerald'
  | 'custom';

export type LayoutId = 'standard' | 'split' | 'poster' | 'certificate';

export type DensityId = 'compact' | 'regular' | 'airy';

export type FontPreset = 'serif' | 'sans' | 'display' | 'gothic';

export type LabelLang = 'zh' | 'en' | 'both';

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  details: string[];
};

export type Party = {
  name: string;
  nameSecondary: string;
  address: string;
  phone: string;
  email: string;
  registrationNo: string;
  taxNo: string;
};

export type DocData = {
  seriesId: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  currency: 'MOP' | 'HKD' | 'CNY';
  seller: Party;
  buyer: Party;
  items: LineItem[];
  discount: number;
  discountType: 'amount' | 'percent';
  taxRate: number;
  notes: string;
  paymentTerms: string;
  paymentMethod: string;
  bankInfo: string;
  logoDataUrl: string;
  chopDataUrl: string;
  logoScale: number;
  chopScale: number;
  chopX: number;
  chopY: number;
};

export type LayoutCustom = {
  accent: string;
  paper: string;
  ink: string;
  layout: LayoutId;
  density: DensityId;
  fontPreset: FontPreset;
  bilingual: boolean;
  labelLang: LabelLang;
  showChop: boolean;
  headerAlign: 'left' | 'center' | 'split';
  showChineseAmount: boolean;
  showValidUntil: boolean;
};

export type SavedFormat = {
  id: string;
  name: string;
  savedAt: string;
  styleId: StyleId;
  custom: LayoutCustom;
};

export type SavedDocument = {
  id: string;
  name: string;
  savedAt: string;
  styleId: StyleId;
  custom: LayoutCustom;
  data: DocData;
};

export const DOCUMENT_FILE_KIND = 'macau-docs-file';

export type DocumentFilePayload = {
  kind: typeof DOCUMENT_FILE_KIND;
  version: 1;
  document: SavedDocument;
};

export type Totals = {
  subtotal: number;
  discountValue: number;
  taxable: number;
  tax: number;
  total: number;
};

export const LEGACY_STYLE_MAP: Record<string, StyleId> = {
  minimal: 'clean',
  artistic: 'emerald',
  editorial: 'bold',
  kandinsky: 'sharp',
  apple: 'compact',
  nike: 'executive',
  renaissance: 'classic',
  macau: 'navy',
};
