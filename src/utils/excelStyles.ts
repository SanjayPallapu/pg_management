import { strToU8, zipSync } from "fflate";

type ExportRow = Record<string, unknown>;
type SheetOptions = { statusColumns?: number[]; currencyColumns?: number[] };
type ExportSheet = {
  name: string;
  data: ExportRow[];
  colWidths: { wch: number }[];
  options?: SheetOptions;
};

export interface StyledWorkbook {
  sheets: ExportSheet[];
}

const escapeXml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const columnName = (index: number) => {
  let result = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  }
  return result;
};

const safeSheetName = (name: string, index: number) => {
  const cleaned = name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31);
  return cleaned || `Sheet ${index + 1}`;
};

const statusStyle = (value: unknown) => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("paid") && !normalized.includes("partial") && !normalized.includes("not")) return 4;
  if (normalized.includes("partial")) return 5;
  if (["pending", "overdue", "-", "not paid"].includes(normalized)) return 6;
  return null;
};

const cellXml = (ref: string, value: unknown, style: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}" t="n"><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${ref}" s="${style}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
};

const sheetXml = (sheet: ExportSheet) => {
  const headers = sheet.data.length > 0 ? Object.keys(sheet.data[0]) : ["Status"];
  const rows = [headers, ...sheet.data.map((row) => headers.map((header) => row[header]))];
  const lastRef = `${columnName(Math.max(headers.length - 1, 0))}${Math.max(rows.length, 1)}`;
  const columns = headers.map((_, index) => {
    const width = Math.min(Math.max(sheet.colWidths[index]?.wch ?? 15, 5), 80);
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join("");
  const rowMarkup = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      let style = rowIndex === 0 ? 1 : rowIndex % 2 === 0 ? 3 : 2;
      if (rowIndex > 0 && sheet.options?.currencyColumns?.includes(columnIndex)) style = rowIndex % 2 === 0 ? 8 : 7;
      if (rowIndex > 0 && sheet.options?.statusColumns?.includes(columnIndex)) style = statusStyle(value) ?? style;
      return cellXml(`${columnName(columnIndex)}${rowIndex + 1}`, value, style);
    }).join("");
    return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="22" customHeight="1"' : ""}>${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastRef}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns}</cols><sheetData>${rowMarkup}</sheetData><autoFilter ref="A1:${columnName(headers.length - 1)}1"/></worksheet>`;
};

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="₹#,##0"/></numFmts>
<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="12"/><name val="Calibri"/></font><font><b/><color rgb="FF166534"/></font><font><b/><color rgb="FF9A3412"/></font><font><color rgb="FF991B1B"/></font><font><b/><color rgb="FF111827"/></font></fonts>
<fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="thin"><color rgb="FFE5E7EB"/></top><bottom style="thin"><color rgb="FFE5E7EB"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="6" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="4" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="164" fontId="5" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="164" fontId="5" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export const buildStyledWorkbookBytes = (workbook: StyledWorkbook) => {
  const sheets = workbook.sheets.length > 0 ? workbook.sheets : [{ name: "Sheet 1", data: [], colWidths: [] }];
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${escapeXml(safeSheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const workbookRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const overrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(stylesXml),
  };
  sheets.forEach((sheet, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetXml(sheet)); });
  return zipSync(files, { level: 6 });
};

export function applyStyledExport(data: ExportRow[], sheetName: string, colWidths: { wch: number }[], options?: SheetOptions & { fileName: string }): StyledWorkbook {
  return { sheets: [{ name: sheetName, data, colWidths, options }] };
}

export function addStyledSheet(workbook: StyledWorkbook, data: ExportRow[], sheetName: string, colWidths: { wch: number }[] = [], options?: SheetOptions) {
  workbook.sheets.push({ name: sheetName, data, colWidths, options });
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

export async function saveAndShareExcel(workbook: StyledWorkbook, fileName: string) {
  const bytes = buildStyledWorkbookBytes(workbook);
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    await Filesystem.writeFile({ path: fileName, data: bytesToBase64(bytes), directory: Directory.Cache });
    const fileUriResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({ title: `Export ${fileName}`, url: fileUriResult.uri });
    return;
  }

  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
