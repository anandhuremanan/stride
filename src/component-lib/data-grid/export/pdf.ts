import type { PdfBand, PdfPaperSize, PdfTheme } from "../core/types";
import { encode, fit, literal, widthOf, type PdfFont } from "./pdf-font";
import { buildPdf, deflate, pdfDate, textString, type PdfObject } from "./pdf-writer";
import type { ExportTable } from "./table";

export interface PrintOptions {
  title: string;
  orientation: "portrait" | "landscape";
  paperSize: PdfPaperSize;
}

/** Fully resolved, as the layout needs it. */
export interface PdfOptions extends PrintOptions {
  /** Page margin in points. 72 points to the inch. */
  margin: number;
  /** Body text size in points; the header row and bands follow from it. */
  fontSize: number;
  header: PdfBand | null;
  footer: PdfBand | null;
  theme: PdfTheme;
}

/** What callers pass. Everything but the print options has a default. */
export interface CreatePdfOptions extends PrintOptions {
  margin?: number;
  fontSize?: number;
  header?: PdfBand | null;
  footer?: PdfBand | null;
  theme?: Partial<PdfTheme>;
}

/** Portrait dimensions in points. Landscape swaps them. */
const PAPER: Record<PdfPaperSize, readonly [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
};

export const defaultPdfTheme: PdfTheme = {
  text: "#18181b",
  muted: "#71717a",
  border: "#d4d4d8",
  headerBg: "#f4f4f5",
  headerText: "#18181b",
  stripe: "#fafafa",
};

/** The grid measures columns in CSS pixels; PDF works in points. */
const PX_TO_PT = 0.75;
const CELL_PAD = 4;

function hex(color: string, stroke: boolean): string {
  const value = color.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  const channel = (at: number) => (parseInt(full.slice(at, at + 2), 16) / 255).toFixed(3);

  return `${channel(0)} ${channel(2)} ${channel(4)} ${stroke ? "RG" : "rg"}`;
}

function round(value: number): string {
  return value.toFixed(2);
}

/**
 * Fills the tokens a header or footer may use. `{pages}` is known before any
 * page is drawn because every body row is the same height.
 */
function resolveBand(
  band: PdfBand | null,
  context: { title: string; page: number; pages: number; at: Date },
): { left: string; center: string; right: string } | null {
  if (!band) return null;

  const swap = (text: string | undefined) =>
    (text ?? "")
      .replace(/\{title\}/g, context.title)
      .replace(/\{page\}/g, String(context.page))
      .replace(/\{pages\}/g, String(context.pages))
      .replace(/\{date\}/g, context.at.toLocaleDateString())
      .replace(/\{time\}/g, context.at.toLocaleTimeString());

  return { left: swap(band.left), center: swap(band.center), right: swap(band.right) };
}

interface TextRun {
  text: string;
  x: number;
  y: number;
  font: PdfFont;
  size: number;
  align: "start" | "end";
  max: number;
}

function drawText(runs: readonly TextRun[]): string {
  let out = "";

  for (const run of runs) {
    if (!run.text) continue;

    const bytes = fit(encode(run.text), run.font, run.size, run.max);
    if (bytes.length === 0) continue;

    // Measure what is actually drawn, not the input: `fit` may have trimmed it.
    const x =
      run.align === "end" ? run.x - widthOf(bytes, run.font, run.size) : run.x;
    const clipped = literal(bytes);

    out += `BT /${run.font === "bold" ? "F2" : "F1"} ${run.size} Tf `;
    out += `${round(x)} ${round(run.y)} Td (${clipped}) Tj ET\n`;
  }

  return out;
}

/**
 * Lays the table out across pages and returns one content stream per page.
 *
 * Rows are a single line each and clipped with an ellipsis, so every row is the
 * same height and page breaks never land inside one.
 */
export function renderPages(table: ExportTable, options: PdfOptions): string[] {
  const [shortSide, longSide] = PAPER[options.paperSize];
  const [pageWidth, pageHeight] =
    options.orientation === "landscape" ? [longSide, shortSide] : [shortSide, longSide];

  const { margin, fontSize, theme } = options;
  const bandHeight = fontSize * 1.6;
  const rowHeight = fontSize * 1.5 + 4;

  const left = margin;
  const right = pageWidth - margin;
  const available = right - left;

  const top = pageHeight - margin - (options.header ? bandHeight : 0);
  const bottom = margin + (options.footer ? bandHeight : 0);

  // Match the grid's proportions, scaled to fill the page width.
  const raw = table.columns.map((column) => Math.max(column.width * PX_TO_PT, 1));
  const total = raw.reduce((sum, width) => sum + width, 0);
  const widths = raw.map((width) => (width / total) * available);

  const edges = [left];
  for (const width of widths) edges.push(edges[edges.length - 1] + width);

  const numeric = table.columns.map((column) => column.type === "number");
  const bodyRows = Math.max(1, Math.floor((top - bottom - rowHeight) / rowHeight));
  const pages = Math.max(1, Math.ceil(table.text.length / bodyRows));
  const at = new Date();

  const streams: string[] = [];

  for (let page = 0; page < pages; page++) {
    const rows = table.text.slice(page * bodyRows, (page + 1) * bodyRows);
    const tableBottom = top - rowHeight - rows.length * rowHeight;

    let fills = "";
    let lines = "";
    const runs: TextRun[] = [];

    // Header row.
    fills += `${hex(theme.headerBg, false)} ${round(left)} ${round(top - rowHeight)} `;
    fills += `${round(available)} ${round(rowHeight)} re f\n`;

    // Zebra striping, drawn before the rules so the rules stay crisp.
    if (theme.stripe) {
      fills += `${hex(theme.stripe, false)}\n`;
      rows.forEach((_, index) => {
        if (index % 2 === 0) return;
        const y = top - rowHeight - (index + 1) * rowHeight;
        fills += `${round(left)} ${round(y)} ${round(available)} ${round(rowHeight)} re f\n`;
      });
    }

    lines += `${hex(theme.border, true)} 0.5 w\n`;
    for (let index = 0; index <= rows.length + 1; index++) {
      const y = top - index * rowHeight;
      lines += `${round(left)} ${round(y)} m ${round(right)} ${round(y)} l\n`;
    }
    for (const edge of edges) {
      lines += `${round(edge)} ${round(top)} m ${round(edge)} ${round(tableBottom)} l\n`;
    }
    lines += "S\n";

    const baseline = (rowTop: number) =>
      rowTop - rowHeight + (rowHeight - fontSize * 0.72) / 2;

    table.columns.forEach((column, index) => {
      runs.push({
        text: column.header,
        x: edges[index] + CELL_PAD,
        y: baseline(top),
        font: "bold",
        size: fontSize,
        align: "start",
        max: widths[index] - CELL_PAD * 2,
      });
    });

    rows.forEach((row, rowIndex) => {
      const rowTop = top - rowHeight - rowIndex * rowHeight;

      row.forEach((text, index) => {
        const alignEnd = numeric[index];
        runs.push({
          text,
          x: alignEnd ? edges[index + 1] - CELL_PAD : edges[index] + CELL_PAD,
          y: baseline(rowTop),
          font: "regular",
          size: fontSize,
          align: alignEnd ? "end" : "start",
          max: widths[index] - CELL_PAD * 2,
        });
      });
    });

    const context = { title: options.title, page: page + 1, pages, at };
    const bands: TextRun[] = [];

    const band = (
      resolved: { left: string; center: string; right: string } | null,
      y: number,
    ) => {
      if (!resolved) return;

      const third = available / 3;
      bands.push(
        { text: resolved.left, x: left, y, font: "regular", size: fontSize * 0.9, align: "start", max: third },
        { text: resolved.center, x: left + available / 2 - third / 2, y, font: "regular", size: fontSize * 0.9, align: "start", max: third },
        { text: resolved.right, x: right, y, font: "regular", size: fontSize * 0.9, align: "end", max: third },
      );
    };

    band(resolveBand(options.header, context), pageHeight - margin - fontSize);
    band(resolveBand(options.footer, context), margin);

    streams.push(
      `q\n${fills}${lines}${hex(theme.headerText, false)}\n` +
        drawText(runs.slice(0, table.columns.length)) +
        `${hex(theme.text, false)}\n` +
        drawText(runs.slice(table.columns.length)) +
        `${hex(theme.muted, false)}\n` +
        drawText(bands) +
        "Q\n",
    );
  }

  return streams;
}

const DEFAULTS = {
  margin: 36,
  fontSize: 9,
  header: { left: "{title}" },
  footer: { left: "{date}", right: "Page {page} of {pages}" },
} as const;

/**
 * Renders the table as a real PDF file — no print dialog, no browser
 * pagination, the same output in every engine.
 */
export async function createPdfBlob(
  table: ExportTable,
  options: CreatePdfOptions,
): Promise<Blob> {
  const resolved: PdfOptions = {
    ...options,
    margin: options.margin ?? DEFAULTS.margin,
    fontSize: options.fontSize ?? DEFAULTS.fontSize,
    header: options.header === undefined ? DEFAULTS.header : options.header,
    footer: options.footer === undefined ? DEFAULTS.footer : options.footer,
    theme: { ...defaultPdfTheme, ...options.theme },
  };

  const [shortSide, longSide] = PAPER[resolved.paperSize];
  const [width, height] =
    resolved.orientation === "landscape" ? [longSide, shortSide] : [shortSide, longSide];

  const streams = renderPages(table, resolved);

  // 1 catalog, 2 pages, 3 regular font, 4 bold font, 5 info, then a page object
  // and a content stream for each page.
  const pageId = (index: number) => 6 + index * 2;
  const kids = streams.map((_, index) => `${pageId(index)} 0 R`).join(" ");

  const objects: PdfObject[] = [
    "<</Type/Catalog/Pages 2 0 R>>",
    `<</Type/Pages/Count ${streams.length}/Kids[${kids}]>>`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>",
    `<</Title ${textString(resolved.title)}/Producer ${textString("GramproKit DataGrid")}` +
      `/CreationDate (${pdfDate(new Date())})>>`,
  ];

  for (const [index, stream] of streams.entries()) {
    const data = await deflate(toBytes(stream));

    objects.push(
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${round(width)} ${round(height)}]` +
        `/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents ${pageId(index) + 1} 0 R>>`,
      data
        ? { extra: "/Filter/FlateDecode", stream: data }
        : { stream },
    );
  }

  return buildPdf(objects, { root: 1, info: 5 });
}

/** Content streams are latin1 by construction, so one character is one byte. */
function toBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function buildPrintHtml(table: ExportTable, options: PrintOptions): string {
  const head = table.columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const numeric = table.columns.map((c) => c.type === "number");
  const body = table.text
    .map(
      (row) =>
        `<tr>${row
          .map((text, i) => `<td${numeric[i] ? ' class="num"' : ""}>${escapeHtml(text)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(options.title)}</title>
<style>
@page { size: ${options.paperSize} ${options.orientation}; margin: 12mm; }
body { font: 9pt/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; margin: 0; }
h1 { font-size: 13pt; margin: 0 0 8px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #c8c8c8; padding: 3px 6px; text-align: start; vertical-align: top; }
th { background: #f0f0f0; font-weight: 600; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
td.num { text-align: end; font-variant-numeric: tabular-nums; }
</style></head><body><h1>${escapeHtml(options.title)}</h1>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

/**
 * Opens the browser's print dialog with the table laid out for paper. Kept
 * alongside `createPdfBlob` for printing to paper, and for text the standard
 * fonts cannot encode.
 */
export function printTable(table: ExportTable, options: PrintOptions): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";

  const cleanup = () => iframe.remove();
  iframe.addEventListener("load", () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    // Fallback for browsers that never fire afterprint.
    setTimeout(cleanup, 60_000);
  }, { once: true });

  iframe.srcdoc = buildPrintHtml(table, options);
  document.body.append(iframe);
}
