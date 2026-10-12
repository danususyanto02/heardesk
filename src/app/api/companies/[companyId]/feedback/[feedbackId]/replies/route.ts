import { z } from "zod";
import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string; feedbackId: string }> },
) {
  try {
    assertOrigin(request);
    const { companyId, feedbackId } = await params;
    const { actor, services } = await companyApi(request, companyId);
    const input = z
      .object({ body: z.string().trim().min(1).max(5000), requestId: z.uuid() })
      .strict()
      .parse(await readJson(request));
    return json(
      await services.addReply(actor, companyId, feedbackId, input.body, input.requestId),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
