export function utcPeriod(now: Date): string { return now.toISOString().slice(0, 7); }
export function quotaAvailable(used: bigint, reserved: bigint, needed: bigint, limit: bigint): boolean {
  return used >= 0n && reserved >= 0n && needed >= 0n && limit >= 0n && used + reserved + needed <= limit;
}
