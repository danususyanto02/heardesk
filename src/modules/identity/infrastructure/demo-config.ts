export function publicDemoConfig(values: Record<string, string | undefined>) {
  if (values.HEARDESK_DEMO_ACCOUNTS !== "true") {
    return null;
  }
  const password = values.HEARDESK_DEMO_PASSWORD;
  if (!password || password.length < 15 || password.length > 128) {
    return null;
  }
  return {
    password,
    platformOwner:
      values.HEARDESK_DEMO_PLATFORM_OWNER === "true" && values.HEARDESK_DEMO_ONLY === "true",
  };
}
