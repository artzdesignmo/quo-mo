import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { DocType } from '../types/doc';

const TYPE_LABEL: Record<DocType, string> = {
  quotation: '報價單',
  invoice: '發票',
  receipt: '收據',
};

function isModernColor(value: string): boolean {
  return /oklch|oklab|lab\(|lch\(|color\(|color-mix/i.test(value);
}

function toRgb(ctx: CanvasRenderingContext2D, value: string): string {
  try {
    ctx.fillStyle = '#000000';
    ctx.fillStyle = value;
    return String(ctx.fillStyle);
  } catch {
    return '#000000';
  }
}

function convertValue(ctx: CanvasRenderingContext2D, value: string): string {
  if (!value || !isModernColor(value)) return value;
  if (/^(oklch|oklab|lab|lch|color)\(/i.test(value.trim())) return toRgb(ctx, value);
  return value.replace(
    /(?:oklch|oklab|lab|lch|color|color-mix)\([^)]*\)/gi,
    (chunk) => toRgb(ctx, chunk),
  );
}

function freezeLayoutMetrics(doc: Document, root: HTMLElement) {
  const view = doc.defaultView;
  if (!view) return;
  const props = [
    'line-height',
    'font-size',
    'letter-spacing',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
  ];
  const visit = (el: Element) => {
    if (el instanceof HTMLElement) {
      const skip =
        el.classList.contains('sheet-row-gap') ||
        el.classList.contains('sheet-row-gap-fill') ||
        el.classList.contains('sheet-row-rule') ||
        el.classList.contains('sheet-row-rule-fill');
      if (!skip) {
        const cs = view.getComputedStyle(el);
        for (const prop of props) {
          const value = cs.getPropertyValue(prop);
          if (value) el.style.setProperty(prop, value);
        }
      }
    }
    for (const child of el.children) visit(child);
  };
  visit(root);
}

function rewriteInlineColors(root: ParentNode, ctx: CanvasRenderingContext2D) {
  const visit = (el: Element) => {
    if (el instanceof HTMLElement) {
      const style = el.style;
      for (let i = style.length - 1; i >= 0; i -= 1) {
        const prop = style.item(i);
        const value = style.getPropertyValue(prop);
        if (!isModernColor(value)) continue;
        style.setProperty(prop, convertValue(ctx, value), style.getPropertyPriority(prop) || 'important');
      }
    }
    for (const child of el.children) visit(child);
  };
  if (root instanceof Element) visit(root);
  else Array.from(root.children).forEach(visit);
}

function patchGetComputedStyle(view: Window, ctx: CanvasRenderingContext2D): () => void {
  const original = view.getComputedStyle.bind(view);
  const wrap = (cs: CSSStyleDeclaration): CSSStyleDeclaration =>
    new Proxy(cs, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return (name: string) => convertValue(ctx, target.getPropertyValue(name));
        }
        if (prop === 'item') {
          return (index: number) => target.item(index);
        }
        const value = Reflect.get(target, prop, target);
        if (typeof value === 'string') return convertValue(ctx, value);
        if (typeof value === 'function') return value.bind(target);
        return value;
      },
    });

  view.getComputedStyle = ((elt: Element, pseudo?: string | null) => wrap(original(elt, pseudo))) as typeof view.getComputedStyle;

  return () => {
    view.getComputedStyle = original;
  };
}

async function waitForFonts(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    // ignore
  }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  );
}

export async function captureSheet(el: HTMLElement): Promise<HTMLCanvasElement> {
  await waitForFonts();
  await waitForImages(el);
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const pageView = el.ownerDocument.defaultView;
  const pageCtx = el.ownerDocument.createElement('canvas').getContext('2d');
  const restorePage = pageView && pageCtx ? patchGetComputedStyle(pageView, pageCtx) : () => {};

  try {
    return await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: false,
      width: el.scrollWidth,
      height: el.scrollHeight,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const view = clonedDoc.defaultView;
        const ctx = clonedDoc.createElement('canvas').getContext('2d');
        if (view && ctx) patchGetComputedStyle(view, ctx);
        if (ctx && clonedDoc.documentElement) rewriteInlineColors(clonedDoc.documentElement, ctx);
        const sheet = clonedDoc.querySelector('.sheet');
        if (sheet instanceof HTMLElement) freezeLayoutMetrics(clonedDoc, sheet);
        clonedDoc.querySelectorAll<HTMLElement>('.sheet-row-gap.is-bot .sheet-row-gap-fill').forEach((gap) => {
          const current = parseFloat(view ? view.getComputedStyle(gap).height : gap.style.height) || 10;
          gap.style.height = `${current + 6}px`;
        });
        clonedDoc.querySelectorAll<HTMLImageElement>('.sheet-chop img').forEach((img) => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          if (!w || !h) return;
          const max = Math.max(img.width, img.height, parseFloat(img.style.width) || 0, parseFloat(img.style.height) || 0);
          const box = w >= h
            ? { w: max || w, h: Math.max(1, Math.round((max || w) * (h / w))) }
            : { w: Math.max(1, Math.round((max || h) * (w / h))), h: max || h };
          img.style.width = `${box.w}px`;
          img.style.height = `${box.h}px`;
          img.removeAttribute('object-fit');
          const wrap = img.closest('.sheet-chop') as HTMLElement | null;
          if (wrap) {
            wrap.style.width = `${box.w}px`;
            wrap.style.height = `${box.h}px`;
            wrap.style.transform = 'none';
          }
        });
      },
    });
  } finally {
    restorePage();
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportJpg(el: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureSheet(el);
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('無法產生 JPG'));
          return;
        }
        downloadBlob(blob, filename);
        resolve();
      },
      'image/jpeg',
      0.95,
    );
  });
}

export async function exportPdf(el: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureSheet(el);
  const img = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = Math.min(pageW / (imgW * 0.264583), pageH / (imgH * 0.264583));
  const w = imgW * 0.264583 * ratio;
  const h = imgH * 0.264583 * ratio;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  pdf.addImage(img, 'JPEG', x, y, w, h);
  pdf.save(filename);
}

export function fileBase(docType: DocType, seriesId: string): string {
  return `${TYPE_LABEL[docType]}-${seriesId}`;
}
