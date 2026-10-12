export function createTrackingCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}
export function trackingLink(code: string): string {
  return `${window.location.origin}/track#code=${encodeURIComponent(code)}`;
}
