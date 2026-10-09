import { expect, it } from "vitest";
import { platformActivity } from "@/modules/platform/application/platform-activity";
it("supports leap-month daily and annual monthly calendar windows", async () => {
  const calls: { start: string; end: string }[] = [];
  const get = platformActivity(
    {
      counts: async (_actor, start, end) => {
        calls.push({ start: start.toISOString(), end: end.toISOString() });
        return [
          { day: "2024-02-29", count: 2 },
          { day: "2024-02-01", count: 1 },
        ];
      },
    },
    { current: async () => ({ userId: "p", emailVerified: true, platformRole: "PLATFORM_OWNER" }) },
    { now: () => new Date("2026-10-08") },
  );
  const monthly = await get({ period: "monthly", year: 2024, month: 2 });
  expect(monthly.points).toHaveLength(29);
  expect(monthly.points[28]).toEqual({ day: "2024-02-29", count: 2 });
  const annual = await get({ period: "annual", year: 2024 });
  expect(annual.points).toHaveLength(12);
  expect(annual.points[1]).toEqual({ day: "2024-02", count: 3 });
  expect(calls[0]).toEqual({ start: "2024-02-01T00:00:00.000Z", end: "2024-03-01T00:00:00.000Z" });
  await expect(get({ period: "monthly", year: 2024, month: 13 })).rejects.toMatchObject({
    code: "PLATFORM_INPUT_INVALID",
  });
});
it("fills UTC date buckets without leaking records or changing injected clock", async () => {
  const now = new Date("2026-10-08T14:00:00Z");
  const get = platformActivity(
    {
      counts: async (actor, start, end) => {
        expect(actor).toBe("p");
        expect(start.toISOString()).toBe("2026-10-02T00:00:00.000Z");
        expect(end.toISOString()).toBe("2026-10-09T00:00:00.000Z");
        return [{ day: "2026-10-08", count: 3 }];
      },
    },
    { current: async () => ({ userId: "p", emailVerified: true, platformRole: "PLATFORM_OWNER" }) },
    { now: () => now },
  );
  expect((await get(7)).points.map((point) => point.count)).toEqual([0, 0, 0, 0, 0, 0, 3]);
  expect(now.toISOString()).toBe("2026-10-08T14:00:00.000Z");
  await expect(get(10000)).rejects.toMatchObject({ code: "PLATFORM_INPUT_INVALID" });
});
