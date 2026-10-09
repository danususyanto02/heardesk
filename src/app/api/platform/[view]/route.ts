import { z } from "zod";
import { platformServices } from "@/server/platform-access";
import { failure, json, HttpError } from "@/server/http";
export async function GET(request: Request, { params }: { params: Promise<{ view: string }> }) {
  try {
    const { view } = await params;
    const services = platformServices(request.headers);
    const query = z
      .object({
        q: z.string().max(200).default(""),
        page: z.coerce.number().int().min(1).max(100000).default(1),
        pageSize: z.coerce
          .number()
          .refine((value) => [10, 25, 50, 100].includes(value))
          .default(25),
      })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    if (view === "overview") {
      return json(await services.overview());
    }
    if (view === "companies" || view === "usage") {
      return json(await services.companies(query));
    }
    if (view === "users") {
      return json(await services.users(query));
    }
    if (view === "audit") {
      return json(await services.audit(query));
    }
    throw new HttpError(404, "Platform view not found.");
  } catch (error) {
    return failure(error);
  }
}
