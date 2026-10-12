import { z } from "zod";
import { legacyCompanyContext } from "@/server/company-context";
import { assertOrigin, failure, json, readJson } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(request);
    const { actor, companyId, services } = await legacyCompanyContext(request.headers);
    const { id } = await params;
    const input = z
      .object({ body: z.string().trim().min(1).max(5000), requestId: z.uuid() })
      .strict()
      .parse(await readJson(request));
    return json(await services.addReply(actor, companyId, id, input.body, input.requestId), 201);
  } catch (error) {
    return failure(error);
  }
}
