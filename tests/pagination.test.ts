import { expect, it } from "vitest";
import { pagination } from "@/modules/shared/domain/pagination";
it("accepts bounded page sizes and calculates SQL offset/limit", () => {
  expect(pagination(143, 2, 25)).toEqual({ page: 2, pageSize: 25, skip: 25, take: 25 });
  expect(pagination(12, 8, 10)).toEqual({ page: 2, pageSize: 10, skip: 10, take: 10 });
  expect(pagination(0, 1)).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
  for (const size of [0, 20, 101, 1000]) expect(() => pagination(100, 1, size)).toThrow();
});
