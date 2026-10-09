import type { Actor } from "../../identity/domain/session";
export type FeedbackPeriod = "monthly" | "annual" | "all";
export type StatisticsInput = Readonly<{
  period: FeedbackPeriod;
  year?: number;
  month?: number;
  siteId?: number;
}>;
export type FeedbackCounts = Readonly<{
  issues: number;
  suggestions: number;
  compliments: number;
  total: number;
}>;
export type StatisticsRow = FeedbackCounts & Readonly<{ label: string }>;
export type FeedbackStatistics = Readonly<{
  companyName: string;
  websiteName: string;
  period: FeedbackPeriod;
  year?: number;
  month?: number;
  years: readonly number[];
  generatedAt: string;
  rows: readonly StatisticsRow[];
  totals: FeedbackCounts;
}>;
export interface FeedbackStatisticsReader {
  read(
    actor: Actor,
    companyId: string,
    input: StatisticsInput,
    now: Date,
  ): Promise<FeedbackStatistics>;
}
