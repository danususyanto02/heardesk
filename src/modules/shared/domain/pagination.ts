export const pageSizes = [10, 25, 50, 100] as const;
export type PageSize = typeof pageSizes[number];
export function pagination(total: number, requestedPage: number, requestedSize: number = 25) {
  if (!pageSizes.includes(requestedSize as PageSize) || !Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > 100000) throw Object.assign(new Error("Invalid pagination"), { code: "PAGINATION_INVALID" });
  const pageSize = requestedSize as PageSize, page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
