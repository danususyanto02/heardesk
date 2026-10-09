import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { feedbackWorkbook } from "@/modules/feedback/infrastructure/feedback-excel";
it("creates real XLSX with numeric monthly counts, total and literal Company text", async () => {
  const bytes = await feedbackWorkbook({
    companyName: "=NOT_A_FORMULA",
    websiteName: "All websites",
    period: "annual",
    year: 2026,
    years: [2026],
    generatedAt: "2026-10-08T00:00:00.000Z",
    rows: [{ label: "2026-01", issues: 2, suggestions: 3, compliments: 1, total: 6 }],
    totals: { issues: 2, suggestions: 3, compliments: 1, total: 6 },
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
  const sheet = workbook.getWorksheet("Feedback totals")!;
  expect(sheet.getCell("B2").value).toBe("=NOT_A_FORMULA");
  expect(sheet.getCell("B8").value).toBe(2);
  expect(sheet.getCell("E9").value).toBe(6);
});
