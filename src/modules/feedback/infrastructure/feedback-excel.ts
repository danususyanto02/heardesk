import ExcelJS from "exceljs";
import type { FeedbackStatistics } from "../domain/statistics";

function periodLabel(report: FeedbackStatistics): string {
  if (report.period === "all") {
    return "All periods";
  }
  if (report.period === "annual") {
    return String(report.year);
  }
  return `${report.year}-${String(report.month).padStart(2, "0")}`;
}
export async function feedbackWorkbook(report: FeedbackStatistics): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HearDesk";
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet("Feedback totals", {
    views: [{ state: "frozen", ySplit: 7 }],
  });
  sheet.columns = [{ width: 25 }, { width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }];
  sheet.addRow(["HearDesk feedback summary"]);
  sheet.addRow(["Company", report.companyName]);
  sheet.addRow(["Website", report.websiteName]);
  sheet.addRow(["Period", periodLabel(report)]);
  sheet.addRow(["Generated (UTC)", report.generatedAt]);
  sheet.addRow(["Timezone", "UTC · All feedback statuses included"]);
  sheet.addRow([
    report.period === "monthly" ? "Date (UTC)" : "Month (UTC)",
    "Masalah",
    "Saran",
    "Pujian",
    "Total",
  ]);
  for (const row of report.rows) {
    sheet.addRow([row.label, row.issues, row.suggestions, row.compliments, row.total]);
  }
  sheet.addRow([
    "Total",
    report.totals.issues,
    report.totals.suggestions,
    report.totals.compliments,
    report.totals.total,
  ]);
  sheet.getRow(7).font = { bold: true };
  sheet.getRow(sheet.rowCount).font = { bold: true };
  sheet.autoFilter = { from: "A7", to: `E${sheet.rowCount - 1}` };
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
