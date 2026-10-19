import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { STYLE_LIST } from '../../data/styles';
import {
  buyerLabel,
  dateLineLabel,
  docTitle,
  grandLabel,
  labeledValue,
  sellerLabel,
  sheetLabel,
  type LabelLang,
} from '../../lib/docLabels';
import {
  amountToChinese,
  computeTotals,
  currencyName,
  docNumber,
  formatDate,
  formatMoney,
  lineAmount,
} from '../../lib/money';
import type { DocData, DocType, LayoutCustom, Party, StyleId } from '../../types/doc';

function LogoImg({ src, scale }: { src: string; scale: number }) {
  const h = Math.round(44 * Math.max(0.4, Math.min(2.5, (Number(scale) || 100) / 100)));
  return <img className="sheet-logo" src={src} alt="" style={{ height: h, width: 'auto', maxHeight: 'none' }} />;
}

function chopBox(naturalW: number, naturalH: number, size: number) {
  const ratio = (naturalW || 1) / (naturalH || 1);
  if (ratio >= 1) return { w: size, h: Math.max(1, Math.round(size / ratio)) };
  return { w: Math.max(1, Math.round(size * ratio)), h: size };
}

function ChopMark({
  src,
  size,
  x,
  y,
  fallback,
}: {
  src: string;
  size: number;
  x: number;
  y: number;
  fallback: string;
}) {
  const [box, setBox] = useState(() => {
    if (!src) return { w: size, h: size };
    const img = new Image();
    img.src = src;
    if (img.complete && img.naturalWidth) return chopBox(img.naturalWidth, img.naturalHeight, size);
    return { w: size, h: size };
  });

  useEffect(() => {
    if (!src) {
      setBox({ w: size, h: size });
      return;
    }
    const img = new Image();
    const apply = () => setBox(chopBox(img.naturalWidth, img.naturalHeight, size));
    img.onload = apply;
    img.src = src;
    if (img.complete && img.naturalWidth) apply();
  }, [src, size]);

  return (
    <div
      className="sheet-chop"
      style={{
        width: box.w,
        height: src ? box.h : size,
        left: x,
        bottom: -y,
      }}
    >
      {src ? (
        <img src={src} alt="" width={box.w} height={box.h} style={{ width: box.w, height: box.h }} />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

function PartyBlock({ label, party, lang }: { label: string; party: Party; lang: LabelLang }) {
  return (
    <div>
      <div className="sheet-party-label">{label}</div>
      <div className="sheet-party-name">{party.name || '—'}</div>
      {party.nameSecondary && <div className="sheet-party-sub">{party.nameSecondary}</div>}
      <div style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{party.address}</div>
      <div>{party.phone}</div>
      <div>{party.email}</div>
      {party.registrationNo && <div>{sheetLabel('bizReg', lang)} {party.registrationNo}</div>}
      {party.taxNo && <div>{sheetLabel('taxNo', lang)} {party.taxNo}</div>}
    </div>
  );
}

function ItemsTable({
  data,
  lang,
  headBar,
}: {
  data: DocData;
  lang: LabelLang;
  headBar?: boolean;
}) {
  const renderRow = (head: boolean, key: string, cells: ReactNode) => (
    <div className={`sheet-row${head ? ' is-head' : ''}${head && headBar ? ' is-bar' : ''}`} key={key}>
      <div className="sheet-row-gap is-top">
        <span className="sheet-row-gap-fill" />
      </div>
      <div className="sheet-row-body">{cells}</div>
      <div className="sheet-row-gap is-bot">
        <span className="sheet-row-gap-fill" />
      </div>
      <div className="sheet-row-rule">
        <span className="sheet-row-rule-fill" />
      </div>
    </div>
  );

  return (
    <div className={`sheet-table${headBar ? ' is-bar' : ''}`}>
      {renderRow(
        true,
        'head',
        <>
          <div className="sheet-cell is-item">{sheetLabel('item', lang)}</div>
          <div className="sheet-cell is-qty">{sheetLabel('qty', lang)}</div>
          <div className="sheet-cell is-num">{sheetLabel('unitPrice', lang)}</div>
          <div className="sheet-cell is-num">{sheetLabel('amount', lang)}</div>
        </>,
      )}
      {data.items.map((item, index) => {
        const details = (item.details || []).map((row) => row.trim()).filter(Boolean);
        return renderRow(
          false,
          item.id,
          <>
            <div className="sheet-cell is-item">
              <div className="sheet-item">
                <div className="sheet-item-num">{index + 1}.</div>
                <div className="sheet-item-body">
                  <div>{item.description || '—'}</div>
                  {details.length > 0 && (
                    <div className="sheet-item-details">
                      {details.map((row, detailIndex) => (
                        <div key={`${item.id}-${detailIndex}`}>{row}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="sheet-cell is-qty">{item.quantity || 0}</div>
            <div className="sheet-cell is-num">{formatMoney(Number(item.unitPrice) || 0, data.currency)}</div>
            <div className="sheet-cell is-num">{formatMoney(lineAmount(item), data.currency)}</div>
          </>,
        );
      })}
    </div>
  );
}

function TotalsAndNotes({
  data,
  docType,
  showChineseAmount,
  totalText,
  lang,
}: {
  data: DocData;
  docType: DocType;
  showChineseAmount: boolean;
  totalText: string;
  lang: LabelLang;
}) {
  const totals = computeTotals(data.items, data.discount, data.discountType, data.taxRate);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 28, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {showChineseAmount && (
          <div className="sheet-words">
            {labeledValue('amountWords', lang, amountToChinese(totals.total, currencyName(data.currency)))}
          </div>
        )}
        {docType === 'receipt' && (
          <div style={{ marginTop: 10, fontSize: 12 }}>{labeledValue('payMethod', lang, data.paymentMethod || '—')}</div>
        )}
        {data.notes && (
          <div className="sheet-notes" style={{ marginTop: 14 }}>
            <div className="sheet-party-label">{sheetLabel('notes', lang)}</div>
            <div style={{ whiteSpace: 'pre-line' }}>{data.notes}</div>
          </div>
        )}
        {docType !== 'receipt' && data.paymentTerms && (
          <div className="sheet-notes" style={{ marginTop: 10 }}>
            <div className="sheet-party-label">{sheetLabel('payTerms', lang)}</div>
            <div>{data.paymentTerms}</div>
          </div>
        )}
        {docType === 'invoice' && data.bankInfo && (
          <div className="sheet-notes" style={{ marginTop: 10 }}>
            <div className="sheet-party-label">{sheetLabel('bank', lang)}</div>
            <div>{data.bankInfo}</div>
          </div>
        )}
      </div>
      <div className="sheet-totals">
        <div className="sheet-tot">
          <span>{sheetLabel('subtotal', lang)}</span>
          <span>{formatMoney(totals.subtotal, data.currency)}</span>
        </div>
        {totals.discountValue > 0 && (
          <div className="sheet-tot">
            <span>{sheetLabel('discount', lang)}{data.discountType === 'percent' ? ` ${data.discount}%` : ''}</span>
            <span>-{formatMoney(totals.discountValue, data.currency)}</span>
          </div>
        )}
        {data.taxRate > 0 && (
          <div className="sheet-tot">
            <span>{sheetLabel('tax', lang)} {data.taxRate}%</span>
            <span>{formatMoney(totals.tax, data.currency)}</span>
          </div>
        )}
        <div className="sheet-tot sheet-tot-grand">
          <span>{totalText}</span>
          <span>{formatMoney(totals.total, data.currency)}</span>
        </div>
      </div>
    </div>
  );
}

function SignFooter({
  data,
  docType,
  number,
  showChop,
  lang,
}: {
  data: DocData;
  docType: DocType;
  number: string;
  showChop: boolean;
  lang: LabelLang;
}) {
  const chopSize = Math.round(88 * Math.max(0.4, Math.min(2.5, (Number(data.chopScale) || 100) / 100)));
  return (
    <>
      <div className="sheet-sign">
        <div>
          <div className="sheet-sign-space">
            {showChop && (
              <ChopMark
                src={data.chopDataUrl}
                size={chopSize}
                x={data.chopX || 0}
                y={data.chopY || 0}
                fallback={sheetLabel(docType === 'receipt' ? 'chopReceipt' : 'chopCompany', lang)}
              />
            )}
          </div>
          <div className="sheet-sign-line">{sheetLabel('signIssuer', lang)}</div>
        </div>
        {docType !== 'receipt' && (
          <div>
            <div className="sheet-sign-space" />
            <div className="sheet-sign-line">
              {sheetLabel(docType === 'quotation' ? 'signClient' : 'signReceive', lang)}
            </div>
          </div>
        )}
      </div>
      <footer className="sheet-footer">
        <span>
          {data.seller.name}
          {data.seller.registrationNo ? `  ·  ${sheetLabel('footerReg', lang)} ${data.seller.registrationNo}` : ''}
        </span>
        <span>{number}</span>
      </footer>
    </>
  );
}

type SheetCtx = {
  data: DocData;
  docType: DocType;
  custom: LayoutCustom;
  title: string;
  totalText: string;
  number: string;
  lang: LabelLang;
  logo: ReactNode;
  fontClass: string;
  cssVars: CSSProperties;
  dateLine: string;
  buyerLabel: string;
  sellerLabel: string;
};

function SharedBody({ ctx, headBar }: { ctx: SheetCtx; headBar?: boolean }) {
  return (
    <>
      <ItemsTable data={ctx.data} lang={ctx.lang} headBar={headBar} />
      <TotalsAndNotes
        data={ctx.data}
        docType={ctx.docType}
        showChineseAmount={ctx.custom.showChineseAmount}
        totalText={ctx.totalText}
        lang={ctx.lang}
      />
      <SignFooter data={ctx.data} docType={ctx.docType} number={ctx.number} showChop={ctx.custom.showChop} lang={ctx.lang} />
    </>
  );
}

function MetaLines({ ctx }: { ctx: SheetCtx }) {
  return (
    <div className="sheet-meta">
      <div>{labeledValue('no', ctx.lang, '')}<b>{ctx.number}</b></div>
      <div>{labeledValue('date', ctx.lang, formatDate(ctx.data.issueDate))}</div>
      {ctx.dateLine ? (
        <div className={ctx.docType === 'quotation' ? 'sheet-meta-valid' : undefined}>{ctx.dateLine}</div>
      ) : null}
    </div>
  );
}

function ClassicLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-classic ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <div className="lay-classic-top">
          <div><b>{sheetLabel('no', ctx.lang)}</b><div>{ctx.number}</div></div>
          <div><b>{sheetLabel('date', ctx.lang)}</b><div>{formatDate(ctx.data.issueDate)}</div></div>
          <div><b>{sheetLabel(ctx.docType === 'invoice' ? 'due' : 'valid', ctx.lang)}</b><div>{ctx.dateLine || '—'}</div></div>
          <div><b>{sheetLabel('address', ctx.lang)}</b><div>{ctx.data.seller.address}</div></div>
          <div><b>{sheetLabel('tel', ctx.lang)}</b><div>{ctx.data.seller.phone}</div></div>
        </div>
        <div className="lay-classic-mid">
          <div className="lay-spine">{ctx.title}</div>
          <div className="lay-classic-main">
            <div className="lay-classic-who">
              <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
              <div style={{ textAlign: 'right' }}>
                {ctx.logo}
                <div className="sheet-title" style={{ marginTop: 8 }}>{ctx.data.seller.name}</div>
                <div className="sheet-party-sub">{ctx.data.seller.nameSecondary}</div>
              </div>
            </div>
            <SharedBody ctx={ctx} headBar />
          </div>
        </div>
      </div>
    </article>
  );
}

function CleanLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-clean ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <header className="lay-clean-head">
          <div>
            <div className="sheet-title">{ctx.title}</div>
            <MetaLines ctx={ctx} />
          </div>
          <div className="lay-clean-to">
            <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
          </div>
        </header>
        <div className="lay-rule-plus"><span /><i>+</i><span /></div>
        <SharedBody ctx={ctx} />
      </div>
    </article>
  );
}

function CompactLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-compact ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <div className="lay-center-kicker">{ctx.data.seller.name}</div>
        <div className="lay-center-title">{ctx.title}</div>
        <div className="lay-rule" />
        <div className="lay-compact-meta">
          <span>{labeledValue('date', ctx.lang, formatDate(ctx.data.issueDate))}</span>
          <span>{ctx.dateLine || ctx.number}</span>
          <span>{labeledValue('no', ctx.lang, ctx.number)}</span>
        </div>
        <div className="lay-rule" />
        <div className="lay-compact-to">
          <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
          <PartyBlock label={ctx.sellerLabel} party={ctx.data.seller} lang={ctx.lang} />
        </div>
        <div className="lay-rule" style={{ marginBottom: 16 }} />
        <SharedBody ctx={ctx} />
        <div className="lay-compact-foot">
          <div>{ctx.data.seller.name}</div>
          <div style={{ textAlign: 'right' }}>
            <div>{ctx.data.seller.phone}</div>
            <div>{ctx.data.seller.email}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ExecutiveLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-executive ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <header className="lay-exec-head">
          <div>
            <div className="sheet-title">{ctx.title}</div>
            <div className="sheet-kicker" style={{ marginTop: 8 }}>{ctx.data.seller.nameSecondary || ctx.data.seller.name}</div>
            <div style={{ marginTop: 10 }}><MetaLines ctx={ctx} /></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {ctx.logo}
            <div className="sheet-party-name" style={{ marginTop: 8 }}>{ctx.data.seller.name}</div>
          </div>
        </header>
        <div className="lay-exec-client">
          <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
        </div>
        <SharedBody ctx={ctx} />
      </div>
    </article>
  );
}

function SidebarLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-sidebar ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="lay-side-rail">
        <div className="lay-side-name">{ctx.data.seller.name}</div>
        <div className="lay-spine">{ctx.title}</div>
      </div>
      <div className="lay-side-rule" />
      <div className="sheet-inner">
        <div className="lay-side-top">
          <div>
            {ctx.logo}
            <div style={{ marginTop: 18 }}>
              <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
            </div>
          </div>
          <MetaLines ctx={ctx} />
        </div>
        <SharedBody ctx={ctx} />
      </div>
    </article>
  );
}

function BoldLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-bold ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="lay-geo">
        <span className="g t" />
        <span className="g c" />
        <span className="g s" />
        <span className="g r" />
        <span className="g o" />
        <span className="g k" />
      </div>
      <div className="sheet-inner">
        <header className="lay-bold-head">
          <div>
            <div className="lay-bold-title">{ctx.title}</div>
            <div className="sheet-kicker">{ctx.number}</div>
            <div style={{ marginTop: 16 }}>
              <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {ctx.logo}
            <div>{ctx.data.seller.phone}</div>
            <div style={{ whiteSpace: 'pre-line' }}>{ctx.data.seller.address}</div>
          </div>
        </header>
        <SharedBody ctx={ctx} />
      </div>
    </article>
  );
}

function NavyLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-navy ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <header className="lay-navy-head">
          <div>
            {ctx.logo}
            <div className="sheet-party-name">{ctx.data.seller.name}</div>
          </div>
          <MetaLines ctx={ctx} />
          <div className="lay-spine is-right">{ctx.title}</div>
        </header>
        <div className="lay-rule" />
        <div className="lay-buyer-block">
          <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
        </div>
        <SharedBody ctx={ctx} />
        <div className="lay-navy-thanks">{sheetLabel('thanks', ctx.lang)}</div>
      </div>
    </article>
  );
}

function EmeraldLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-emerald ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <div className="lay-em-title">{ctx.title}</div>
        <div className="lay-em-who">
          <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
          <MetaLines ctx={ctx} />
        </div>
        <SharedBody ctx={ctx} />
        <div className="lay-em-foot">
          <div>
            <div className="lay-thanks">{sheetLabel('thanks', ctx.lang)}</div>
            <div className="sheet-party-label">{sheetLabel('payInfo', ctx.lang)}</div>
            <div>{ctx.data.bankInfo || ctx.data.paymentTerms}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {ctx.logo}
            <div className="sheet-party-name">{ctx.data.seller.name}</div>
            <div style={{ whiteSpace: 'pre-line' }}>{ctx.data.seller.address}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CustomLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-custom ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <div className="sheet-kicker">{ctx.title}</div>
        <div className="lay-custom-title">{ctx.title}</div>
        <div className="lay-custom-meta">
          <div>
            <PartyBlock label={ctx.sellerLabel} party={ctx.data.seller} lang={ctx.lang} />
            <div style={{ marginTop: 16 }}>
              <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
            </div>
          </div>
          <div className="lay-custom-ids">
            <div className="sheet-party-label">{sheetLabel('issued', ctx.lang)}</div>
            <div className="lay-pill">{ctx.number}</div>
            <div className="sheet-party-label" style={{ marginTop: 12 }}>{sheetLabel('date', ctx.lang)}</div>
            <div>{formatDate(ctx.data.issueDate)}</div>
            {ctx.dateLine ? <div className="sheet-meta-valid" style={{ marginTop: 8 }}>{ctx.dateLine}</div> : null}
          </div>
        </div>
        {ctx.data.notes && (
          <div className="lay-custom-about">
            <div className="sheet-party-name">{sheetLabel('notes', ctx.lang)}</div>
            <div className="lay-rule-inline" />
            <div style={{ whiteSpace: 'pre-line' }}>{ctx.data.notes}</div>
          </div>
        )}
        <ItemsTable data={ctx.data} lang={ctx.lang} />
        <TotalsAndNotes
          data={ctx.data}
          docType={ctx.docType}
          showChineseAmount={ctx.custom.showChineseAmount}
          totalText={ctx.totalText}
          lang={ctx.lang}
        />
        <SignFooter data={ctx.data} docType={ctx.docType} number={ctx.number} showChop={ctx.custom.showChop} lang={ctx.lang} />
      </div>
    </article>
  );
}

function SharpLayout({ ctx }: { ctx: SheetCtx }) {
  return (
    <article className={`sheet sheet-sharp sheet-density-${ctx.custom.density} ${ctx.fontClass}`} style={ctx.cssVars}>
      <div className="sheet-inner">
        <header className="sheet-head" style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div>
            {ctx.logo}
            <div className="sheet-title">{ctx.title}</div>
          </div>
          <MetaLines ctx={ctx} />
        </header>
        <div className="sheet-parties" style={{ marginBottom: 22 }}>
          <PartyBlock label={ctx.sellerLabel} party={ctx.data.seller} lang={ctx.lang} />
          <PartyBlock label={ctx.buyerLabel} party={ctx.data.buyer} lang={ctx.lang} />
        </div>
        <SharedBody ctx={ctx} />
      </div>
    </article>
  );
}

type Props = {
  data: DocData;
  docType: DocType;
  styleId: StyleId;
  custom: LayoutCustom;
};

export default function DocumentSheet({ data, docType, styleId, custom }: Props) {
  const meta = STYLE_LIST.find((s) => s.id === styleId) || STYLE_LIST[0];
  const lang: LabelLang = custom.labelLang || (custom.bilingual ? 'both' : 'zh');
  const number = docNumber(data.seriesId, docType);
  const paper = custom.paper || meta.paper;
  const ink = custom.ink || meta.ink;
  const accent = custom.accent || meta.accent;
  const fontPreset = styleId === 'custom' || custom.fontPreset !== 'sans' ? custom.fontPreset : undefined;
  const dateLine =
    docType === 'quotation'
      ? custom.showValidUntil
        ? labeledValue(dateLineLabel(docType, lang), lang, formatDate(data.validUntil))
        : ''
      : labeledValue(
          dateLineLabel(docType, lang),
          lang,
          formatDate(docType === 'invoice' ? data.dueDate : data.issueDate),
        );
  const cssVars = { '--paper': paper, '--ink': ink, '--accent': accent } as CSSProperties;
  const ctx: SheetCtx = {
    data,
    docType,
    custom,
    title: docTitle(docType, lang),
    totalText: grandLabel(docType, lang),
    number,
    lang,
    logo: data.logoDataUrl ? <LogoImg src={data.logoDataUrl} scale={data.logoScale} /> : null,
    fontClass: fontPreset ? `sheet-font-${fontPreset}` : '',
    cssVars,
    dateLine,
    buyerLabel: buyerLabel(docType, lang),
    sellerLabel: sellerLabel(lang),
  };

  if (styleId === 'classic') return <ClassicLayout ctx={ctx} />;
  if (styleId === 'clean') return <CleanLayout ctx={ctx} />;
  if (styleId === 'compact') return <CompactLayout ctx={ctx} />;
  if (styleId === 'executive') return <ExecutiveLayout ctx={ctx} />;
  if (styleId === 'sidebar') return <SidebarLayout ctx={ctx} />;
  if (styleId === 'bold') return <BoldLayout ctx={ctx} />;
  if (styleId === 'navy') return <NavyLayout ctx={ctx} />;
  if (styleId === 'emerald') return <EmeraldLayout ctx={ctx} />;
  if (styleId === 'custom') return <CustomLayout ctx={ctx} />;
  return <SharpLayout ctx={ctx} />;
}
