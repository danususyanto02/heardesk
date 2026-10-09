export function createOrganizationBoundary(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith("/api/auth/organization/")) {
      return Response.json(
        { code: "ORGANIZATION_MUTATION_DISABLED", message: "Use the authorized Company API." },
        {
          status: 403,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    return handler(request);
  };
}
