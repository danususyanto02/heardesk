export function usageStatus(
  used: bigint,
  limit: bigint,
): { state: "normal" | "warning" | "limit" | "disabled"; percent: number | null; label: string } {
  if (used < 0n || limit < 0n) {
    throw new Error("Usage and limits cannot be negative.");
  }
  if (limit === 0n) {
    return { state: "disabled", percent: null, label: "Tidak tersedia" };
  }
  let state: "normal" | "warning" | "limit" = "normal";
  if (used >= limit) {
    state = "limit";
  } else if (used * 100n >= limit * 80n) {
    state = "warning";
  }
  const labels = { limit: "Limit reached", warning: "Near limit", normal: "Normal" };
  return {
    state,
    percent: Number((used * 10000n) / limit) / 100,
    label: labels[state],
  };
}
