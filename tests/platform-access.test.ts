import { expect, it } from "vitest";
import { requirePlatformOwner } from "@/modules/identity/application/require-platform-owner";
it("requires fresh session and separate platform authority", async () => {
  await expect(requirePlatformOwner({ current: async () => null })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await expect(requirePlatformOwner({ current: async () => ({ userId: "owner", emailVerified: true, platformRole: "USER" }) })).rejects.toMatchObject({ code: "PLATFORM_FORBIDDEN" });
  await expect(requirePlatformOwner({ current: async () => ({ userId: "owner", emailVerified: false, platformRole: "PLATFORM_OWNER" }) })).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  expect((await requirePlatformOwner({ current: async () => ({ userId: "platform", emailVerified: true, platformRole: "PLATFORM_OWNER" }) })).userId).toBe("platform");
});
