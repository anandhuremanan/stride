/*
 * Minimal PDF 1.7 writer: a header, numbered objects, a cross-reference table
 * of byte offsets and a trailer. Enough for a paginated table, and nothing
 * more.
 *
 * Everything that is not stream data is built as a string whose character
 * codes are all <= 255, so one character is one byte and offsets stay exact.
 * Using UTF-8 here would silently shift every offset past the first accented
 * character and produce a file that some viewers repair and others reject.
 */

/**
 * A body such as `<</Type/Catalog …>>`, or a stream. A stream's `/Length` is
 * measured by the writer; `extra` carries anything else the dictionary needs,
 * such as `/Filter/FlateDecode`.
 */
export type PdfObject = string | { extra?: string; stream: string | Uint8Array };

const HEADER = "%PDF-1.7\n%âãÏÓ\n";

function latin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * Deflates with the platform's own compressor, which emits exactly the zlib
 * wrapper `/FlateDecode` expects. Returns null where CompressionStream is
 * missing, and the caller writes the stream uncompressed instead.
 */
export async function deflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;

  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * A PDF text string, for values like /Title that a viewer shows as chrome.
 *
 * These are NOT the page's WinAnsi strings: a bare literal is read as
 * PDFDocEncoding, which disagrees with WinAnsi across 0x80-0x9F — an em dash
 * would arrive as "S-caron". UTF-16BE behind a byte-order mark is unambiguous.
 */
export function textString(value: string): string {
  let hex = "FEFF";
  for (let i = 0; i < value.length; i++) {
    hex += value.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/** A PDF date string, as `/CreationDate` wants it. */
export function pdfDate(at: Date): string {
  return (
    `D:${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1, 2)}${pad(at.getUTCDate(), 2)}` +
    `${pad(at.getUTCHours(), 2)}${pad(at.getUTCMinutes(), 2)}${pad(at.getUTCSeconds(), 2)}` +
    `+00'00'`
  );
}

/**
 * Assembles the file. Objects are numbered by position, so `objects[0]` is
 * object 1 — the same numbers the bodies reference.
 */
export function buildPdf(
  objects: readonly PdfObject[],
  trailer: { root: number; info: number },
): Blob {
  const parts: Uint8Array[] = [latin1(HEADER)];
  const offsets: number[] = [];
  let offset = HEADER.length;

  const push = (chunk: Uint8Array) => {
    parts.push(chunk);
    offset += chunk.length;
  };

  objects.forEach((object, index) => {
    offsets.push(offset);
    push(latin1(`${index + 1} 0 obj\n`));

    if (typeof object === "string") {
      push(latin1(`${object}\n`));
    } else {
      const data = typeof object.stream === "string" ? latin1(object.stream) : object.stream;
      push(latin1(`<</Length ${data.length}${object.extra ?? ""}>>\nstream\n`));
      push(data);
      push(latin1("\nendstream\n"));
    }

    push(latin1("endobj\n"));
  });

  const start = offset;
  // Entries are exactly 20 bytes each; the table is unusable otherwise.
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const at of offsets) xref += `${pad(at, 10)} 00000 n \n`;

  push(
    latin1(
      `${xref}trailer\n<</Size ${objects.length + 1}/Root ${trailer.root} 0 R` +
        `/Info ${trailer.info} 0 R>>\nstartxref\n${start}\n%%EOF\n`,
    ),
  );

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
