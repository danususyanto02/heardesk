import { APIError, createAuthMiddleware } from "better-auth/api";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";

export function companyOrganizationPlugin() {
  const ac = createAccessControl({ organization: ["update", "delete"], member: ["create", "update", "delete"], invitation: ["create", "cancel"] } as const);
  const none = ac.newRole({ organization: [], member: [], invitation: [] });
  const plugin = organization({
    creatorRole: "OWNER", invitationExpiresIn: 7 * 24 * 60 * 60,
    allowUserToCreateOrganization: false,
    ac, roles: { OWNER: ac.newRole({ organization: ["update", "delete"], member: ["create", "update", "delete"], invitation: ["create", "cancel"] }),
      ADMIN: ac.newRole({ organization: [], member: ["create", "update", "delete"], invitation: ["create", "cancel"] }), AGENT: none, VIEWER: none },
  });
  return {
    ...plugin,
    hooks: { before: [{ matcher: (ctx: { path?: string }) => ctx.path?.startsWith("/organization/") === true,
      handler: createAuthMiddleware(async () => { throw new APIError("FORBIDDEN", { code: "ORGANIZATION_MUTATION_DISABLED", message: "Use the authorized Company API." }); }),
    }] },
  };
}
