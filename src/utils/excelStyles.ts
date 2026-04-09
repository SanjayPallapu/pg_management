import XLSX from 'xlsx-js-style';

const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
  fill: { fgColor: { rgb: "4F46E5" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } },
  },
};

const evenRowStyle = {
  fill: { fgColor: { rgb: "F3F4F6" } },
  border: {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } },
  },
};

const oddRowStyle = {
  fill: { fgColor: { rgb: "FFFFFF" } },
  border: {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } },
  },
};

const paidStyle = {
  font: { color: { rgb: "166534" }, bold: true },
  fill: { fgColor: { rgb: "DCFCE7" } },
};

const partialStyle = {
  font: { color: { rgb: "9A3412" }, bold: true },
  fill: { fgColor: { rgb: "FEF3C7" } },
};

const pendingStyle = {
  font: { color: { rgb: "991B1B" } },
  fill: { fgColor: { rgb: "FEE2E2" } },
};

const currencyStyle = {
  font: { bold: true },
  numFmt: '₹#,##0',
};

export function applyStyledExport(
  data: any[],
  sheetName: string,
  colWidths: { wch: number }[],
  options?: {
    statusColumns?: number[];
    currencyColumns?: number[];
    fileName: string;
  }
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = colWidths;

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Style headers
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  // Style data rows
  for (let r = 1; r <= range.e.r; r++) {
    const isEven = r % 2 === 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const baseStyle = isEven ? { ...evenRowStyle } : { ...oddRowStyle };
      let cellStyle: any = { ...baseStyle };

      // Apply currency formatting
      if (options?.currencyColumns?.includes(c)) {
        cellStyle = { ...cellStyle, ...currencyStyle, font: { ...cellStyle.font, ...currencyStyle.font } };
      }

      // Apply status-based coloring
      if (options?.statusColumns?.includes(c)) {
        const val = String(ws[addr].v || '').toLowerCase();
        if (val.includes('paid') && !val.includes('partial') && !val.includes('not')) {
          cellStyle = { ...cellStyle, ...paidStyle, border: cellStyle.border };
        } else if (val.includes('partial')) {
          cellStyle = { ...cellStyle, ...partialStyle, border: cellStyle.border };
        } else if (val === 'pending' || val === 'overdue' || val === '-') {
          cellStyle = { ...cellStyle, ...pendingStyle, border: cellStyle.border };
        }
      }

      ws[addr].s = cellStyle;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

export function addStyledSheet(
  wb: any,
  data: any[],
  sheetName: string,
  colWidths?: { wch: number }[],
  options?: { statusColumns?: number[]; currencyColumns?: number[] }
) {
  const ws = XLSX.utils.json_to_sheet(data);
  if (colWidths) ws['!cols'] = colWidths;

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  for (let r = 1; r <= range.e.r; r++) {
    const isEven = r % 2 === 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      const baseStyle = isEven ? { ...evenRowStyle } : { ...oddRowStyle };
      let cellStyle: any = { ...baseStyle };

      if (options?.currencyColumns?.includes(c)) {
        cellStyle = { ...cellStyle, ...currencyStyle, font: { ...cellStyle.font, ...currencyStyle.font } };
      }
      if (options?.statusColumns?.includes(c)) {
        const val = String(ws[addr].v || '').toLowerCase();
        if (val.includes('paid') && !val.includes('partial') && !val.includes('not')) {
          cellStyle = { ...cellStyle, ...paidStyle, border: cellStyle.border };
        } else if (val.includes('partial')) {
          cellStyle = { ...cellStyle, ...partialStyle, border: cellStyle.border };
        } else if (val === 'pending' || val === 'overdue' || val === '-') {
          cellStyle = { ...cellStyle, ...pendingStyle, border: cellStyle.border };
        }
      }

      ws[addr].s = cellStyle;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

export { XLSX };
