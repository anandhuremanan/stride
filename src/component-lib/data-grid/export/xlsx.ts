import type { ExportCellValue } from "../core/types";
import type { ExportTable } from "./table";
import { createZip } from "./zip";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

/** Characters XML 1.0 does not allow at all. */
const INVALID_XML_CHARS = /[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu;

const XML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export const escapeXml = (text: string) =>
  text.replace(INVALID_XML_CHARS, "").replace(/[&<>"]/g, (c) => XML_ENTITIES[c]);

export function columnName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/** Excel serial date in local time. */
function toSerialDate(date: Date): number {
  return (date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000 + 25_569;
}

// Style indexes into cellXfs below.
const STYLE_HEADER = 1;
const STYLE_DATE = 2;
const STYLE_DATETIME = 3;

function cell(ref: string, value: ExportCellValue, style = 0): string {
  const s = style ? ` s="${style}"` : "";
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? `<c r="${ref}"${s}><v>${value}</v></c>` : "";
  }
  if (typeof value === "boolean") return `<c r="${ref}" t="b"${s}><v>${value ? 1 : 0}</v></c>`;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const serial = toSerialDate(value);
    const dateStyle = Number.isInteger(serial) ? STYLE_DATE : STYLE_DATETIME;
    return `<c r="${ref}" s="${dateStyle}"><v>${serial}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

const STYLES = `${XML_HEADER}<styleSheet xmlns="${MAIN_NS}">\
<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/></numFmts>\
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>\
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>\
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>\
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>\
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>\
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>\
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export function createXlsxBlob(table: ExportTable, sheetName = "Sheet1"): Blob {
  const encoder = new TextEncoder();
  const name = sheetName.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet1";
  const columnCount = Math.max(1, table.columns.length);
  const lastRef = `${columnName(columnCount - 1)}${table.values.length + 1}`;

  const header =
    `${XML_HEADER}<worksheet xmlns="${MAIN_NS}">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${table.columns
      .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(8, Math.round(c.width / 7))}" customWidth="1"/>`)
      .join("")}</cols>` +
    `<sheetData><row r="1">${table.columns
      .map((c, i) => cell(`${columnName(i)}1`, c.header, STYLE_HEADER))
      .join("")}</row>`;

  // Encode in chunks to keep peak memory low on large exports.
  const chunks: Uint8Array[] = [encoder.encode(header)];
  const names = table.columns.map((_, i) => columnName(i));
  const CHUNK_ROWS = 2000;
  for (let start = 0; start < table.values.length; start += CHUNK_ROWS) {
    let xml = "";
    const end = Math.min(table.values.length, start + CHUNK_ROWS);
    for (let r = start; r < end; r++) {
      const rowNumber = r + 2;
      xml += `<row r="${rowNumber}">`;
      table.values[r].forEach((value, c) => {
        xml += cell(`${names[c]}${rowNumber}`, value);
      });
      xml += "</row>";
    }
    chunks.push(encoder.encode(xml));
  }
  chunks.push(encoder.encode(`</sheetData><autoFilter ref="A1:${lastRef}"/></worksheet>`));

  const escapedName = escapeXml(name).replace(/'/g, "''");
  const workbook =
    `${XML_HEADER}<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
    `<sheets><sheet name="${escapeXml(name)}" sheetId="1" r:id="rId1"/></sheets>` +
    `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${escapedName}'!$A$1:$${columnName(columnCount - 1)}$${table.values.length + 1}</definedName></definedNames>` +
    `</workbook>`;

  return createZip(
    [
      {
        name: "[Content_Types].xml",
        content:
          `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `</Types>`,
      },
      {
        name: "_rels/.rels",
        content: `${XML_HEADER}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      },
      { name: "xl/workbook.xml", content: workbook },
      {
        name: "xl/_rels/workbook.xml.rels",
        content:
          `${XML_HEADER}<Relationships xmlns="${PKG_REL_NS}">` +
          `<Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/>` +
          `</Relationships>`,
      },
      { name: "xl/styles.xml", content: STYLES },
      { name: "xl/worksheets/sheet1.xml", content: chunks },
    ],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
