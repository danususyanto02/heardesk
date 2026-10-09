import type { SessionReader } from "../../identity/domain/session";
import type { Clock } from "../../usage/domain/usage";
import { requirePlatformOwner } from "../../identity/application/require-platform-owner";
import type { ActivityReader } from "../domain/activity";
export type ActivityPeriod = { period: "monthly" | "annual"; year: number; month?: number };

function validateActivityPeriod(input: ActivityPeriod): void {
  const validYear = Number.isInteger(input.year) && input.year >= 1900 && input.year <= 9998;
  const validMonth = Number.isInteger(input.month) && input.month! >= 1 && input.month! <= 12;
  if (
    !validYear ||
    !["monthly", "annual"].includes(input.period) ||
    (input.period === "monthly" && !validMonth)
  ) {
    throw Object.assign(new Error("Invalid reporting period"), { code: "PLATFORM_INPUT_INVALID" });
  }
}

function parseActivityRange(
  input: ActivityPeriod | number,
  now: Date,
): { start: Date; end: Date; daily: boolean } {
  if (typeof input === "number") {
    if (![7, 30, 90].includes(input)) {
      throw Object.assign(new Error("Invalid date range"), { code: "PLATFORM_INPUT_INVALID" });
    }
    const end = new Date(now);
    end.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(end.getUTCDate() + 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - input);
    return { start, end, daily: true };
  }
  validateActivityPeriod(input);
  const daily = input.period === "monthly";
  const start = new Date(Date.UTC(input.year, daily ? input.month! - 1 : 0, 1));
  const end = new Date(Date.UTC(input.year, daily ? input.month! : 12, 1));
  return { start, end, daily };
}

export function platformActivity(reader: ActivityReader, session: SessionReader, clock: Clock) {
  return async (input: ActivityPeriod | number) => {
    const actor = await requirePlatformOwner(session);
    const now = clock.now();
    const { start, end, daily } = parseActivityRange(input, now);
    const data = new Map<string, number>();
    for (const row of await reader.counts(actor.userId, start, end)) {
      const key = row.day.slice(0, daily ? 10 : 7);
      data.set(key, (data.get(key) ?? 0) + row.count);
    }
    const points: { day: string; count: number }[] = [];
    for (
      const date = new Date(start);
      date < end;
      daily ? date.setUTCDate(date.getUTCDate() + 1) : date.setUTCMonth(date.getUTCMonth() + 1)
    ) {
      const day = date.toISOString().slice(0, daily ? 10 : 7);
      points.push({ day, count: data.get(day) ?? 0 });
    }
    const years = [
      ...new Set([now.getUTCFullYear(), ...(reader.years ? await reader.years(actor.userId) : [])]),
    ].sort((a, b) => b - a);
    return { points, years };
  };
}
