export function localSignupEnabled(values: Record<string, string | undefined>): boolean {
  if (values.HEARDESK_LOCAL_SIGNUP !== "true" || values.HEARDESK_EMAIL_MODE !== "local") {
    return false;
  }
  try {
    const url = new URL(values.APP_URL ?? "");
    return (
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      ["http:", "https:"].includes(url.protocol)
    );
  } catch {
    return false;
  }
}
