import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { addStyledSheet, applyStyledExport, buildStyledWorkbookBytes } from "./excelStyles";

describe("styled Excel export", () => {
  it("builds a valid multi-sheet XLSX package without SheetJS", () => {
    const workbook = applyStyledExport(
      [{ Tenant: "A & B", Rent: 6000, Status: "Paid" }],
      "Rent / Overview",
      [{ wch: 24 }, { wch: 14 }, { wch: 14 }],
      { fileName: "rent.xlsx", currencyColumns: [1], statusColumns: [2] },
    );
    addStyledSheet(workbook, [{ Room: "205", Deposit: 0 }], "Stay", [{ wch: 12 }, { wch: 14 }], { currencyColumns: [1] });

    const files = unzipSync(buildStyledWorkbookBytes(workbook));
    expect(Object.keys(files)).toContain("xl/workbook.xml");
    expect(Object.keys(files)).toContain("xl/worksheets/sheet2.xml");
    expect(strFromU8(files["xl/workbook.xml"])).toContain("Rent   Overview");
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("A &amp; B");
    expect(strFromU8(files["xl/worksheets/sheet2.xml"])).toContain('<v>0</v>');
  });
});
