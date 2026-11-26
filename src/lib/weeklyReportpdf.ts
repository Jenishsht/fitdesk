import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const W = 595;
const H = 842;
const M = 40;
const CW = W - 2 * M;

const C = {
  navy: rgb(0.06, 0.16, 0.33),
  blue: rgb(0.15, 0.39, 0.92),
  text: rgb(0.12, 0.14, 0.18),
  muted: rgb(0.42, 0.45, 0.5),
  line: rgb(0.88, 0.9, 0.93),
  zebra: rgb(0.96, 0.97, 0.99),
  card: rgb(0.97, 0.98, 1),
  white: rgb(1, 1, 1),
  green: rgb(0.09, 0.64, 0.35),
  red: rgb(0.86, 0.2, 0.2),
  amber: rgb(0.92, 0.58, 0.05),
};

// built-in PDF fonts only support basic English characters
const clean = (s: string) => s.replace(/[^\x20-\x7E]/g, "?");

export type Stat = {
  label: string;
  value: string;
  sub?: string;
  tone?: "blue" | "green" | "red" | "amber";
};
export type Column = { header: string; width: number; align?: "left" | "right" }; // width = fraction, all columns sum to 1
export type TableDef = {
  title: string;
  columns: Column[];
  rows: string[][];
  emptyText: string;
};
export type ReportData = {
  gymName: string;
  title: string;
  period: string;
  generatedOn: string;
  stats: Stat[];
  tables: TableDef[];
};

function fit(text: string, font: PDFFont, size: number, maxW: number) {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "...", size) > maxW) t = t.slice(0, -1);
  return t + "...";
}

export async function buildReportPdf(d: ReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const textRight = (t: string, xRight: number, ty: number, size: number, f: PDFFont, color = C.text) => {
    const s = clean(t);
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y: ty, size, font: f, color });
  };

  const newPage = (first: boolean) => {
    page = pdf.addPage([W, H]);
    pages.push(page);
    if (first) {
      page.drawRectangle({ x: 0, y: H - 100, width: W, height: 100, color: C.navy });
      page.drawRectangle({ x: 0, y: H - 104, width: W, height: 4, color: C.blue });
      page.drawText(clean(fit(d.gymName, bold, 22, CW)), { x: M, y: H - 44, size: 22, font: bold, color: C.white });
      page.drawText(clean(d.title), { x: M, y: H - 64, size: 12, font, color: rgb(0.8, 0.86, 0.96) });
      page.drawText(clean(`Period: ${d.period}`), { x: M, y: H - 82, size: 10, font, color: rgb(0.8, 0.86, 0.96) });
      y = H - 100 - 26;
    } else {
      page.drawRectangle({ x: 0, y: H - 30, width: W, height: 30, color: C.navy });
      page.drawText(clean(`${d.gymName} - ${d.title}`), { x: M, y: H - 20, size: 10, font: bold, color: C.white });
      textRight(d.period, W - M, H - 20, 9, font, rgb(0.8, 0.86, 0.96));
      y = H - 30 - 24;
    }
  };

  const ensure = (h: number) => {
    if (y - h < 50) newPage(false);
  };

  newPage(true);

  // ---------- summary cards ----------
  const gap = 10;
  const cardW = (CW - gap * 3) / 4;
  const cardH = 60;
  const tone = { blue: C.blue, green: C.green, red: C.red, amber: C.amber };

  for (let i = 0; i < d.stats.length; i += 4) {
    ensure(cardH + gap);
    d.stats.slice(i, i + 4).forEach((s, j) => {
      const x = M + j * (cardW + gap);
      const color = tone[s.tone ?? "blue"];
      page.drawRectangle({ x, y: y - cardH, width: cardW, height: cardH, color: C.card, borderColor: C.line, borderWidth: 1 });
      page.drawRectangle({ x, y: y - cardH, width: 4, height: cardH, color });
      page.drawText(clean(s.label.toUpperCase()), { x: x + 12, y: y - 17, size: 7.5, font: bold, color: C.muted });
      page.drawText(clean(fit(s.value, bold, 17, cardW - 20)), { x: x + 12, y: y - 38, size: 17, font: bold, color: C.navy });
      if (s.sub) page.drawText(clean(fit(s.sub, font, 8, cardW - 20)), { x: x + 12, y: y - 52, size: 8, font, color: C.muted });
    });
    y -= cardH + gap;
  }
  y -= 14;

  // ---------- tables ----------
  const rowH = 20;
  const headH = 22;
  const pad = 6;
  const MAX_ROWS = 40;

  for (const t of d.tables) {
    const cols = t.columns.map((c) => ({ ...c, w: c.width * CW }));
    const rows =
      t.rows.length > MAX_ROWS
        ? [...t.rows.slice(0, MAX_ROWS), [`... and ${t.rows.length - MAX_ROWS} more`, ...cols.slice(1).map(() => "")]]
        : t.rows;

    ensure(26 + headH + rowH * 2);

    page.drawRectangle({ x: M, y: y - 16, width: 4, height: 16, color: C.blue });
    page.drawText(clean(t.title), { x: M + 12, y: y - 13, size: 13, font: bold, color: C.navy });
    textRight(`${t.rows.length} ${t.rows.length === 1 ? "record" : "records"}`, W - M, y - 12, 9, font, C.muted);
    y -= 28;

    const cell = (text: string, x: number, ty: number, c: (typeof cols)[number], f: PDFFont, size: number, color = C.text) => {
      const s = fit(clean(text), f, size, c.w - 2 * pad);
      const w = f.widthOfTextAtSize(s, size);
      const tx = c.align === "right" ? x + c.w - pad - w : x + pad;
      page.drawText(s, { x: tx, y: ty, size, font: f, color });
    };

    const header = () => {
      page.drawRectangle({ x: M, y: y - headH, width: CW, height: headH, color: C.navy });
      let x = M;
      for (const c of cols) {
        cell(c.header, x, y - headH + 7, c, bold, 8.5, C.white);
        x += c.w;
      }
      y -= headH;
    };

    header();

    if (rows.length === 0) {
      page.drawRectangle({ x: M, y: y - 30, width: CW, height: 30, color: C.zebra, borderColor: C.line, borderWidth: 0.5 });
      page.drawText(clean(t.emptyText), { x: M + pad + 2, y: y - 19, size: 10, font: italic, color: C.muted });
      y -= 30;
    } else {
      rows.forEach((r, i) => {
        if (y - rowH < 50) {
          newPage(false);
          header();
        }
        if (i % 2 === 0) page.drawRectangle({ x: M, y: y - rowH, width: CW, height: rowH, color: C.zebra });
        let x = M;
        cols.forEach((c, k) => {
          cell(r[k] ?? "", x, y - rowH + 6, c, k === 0 ? bold : font, 9);
          x += c.w;
        });
        page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + CW, y: y - rowH }, thickness: 0.5, color: C.line });
        y -= rowH;
      });
    }
    y -= 24;
  }

  // ---------- footer on every page ----------
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 34 }, end: { x: W - M, y: 34 }, thickness: 0.5, color: C.line });
    p.drawText(clean(`Generated on ${d.generatedOn}  |  ${d.gymName}`), { x: M, y: 20, size: 8, font, color: C.muted });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, { x: W - M - font.widthOfTextAtSize(label, 8), y: 20, size: 8, font, color: C.muted });
  });

  return pdf.save();
}