import { legacyCompanyContext } from "@/server/company-context";
import { failure, json } from "@/server/http";
import { requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { feedbackQueryInput } from "@/server/feedback-query";
export async function GET(request: Request) {
  try {
    const input = feedbackQueryInput.parse(Object.fromEntries(new URL(request.url).searchParams));
    const current = await requireActor(request.headers);
    if (!(await db.member.findFirst({ where: { userId: current.userId } }))) {
      return json({ items: [], total: 0, page: 1, pageSize: input.pageSize });
    }
    const { actor, companyId, services } = await legacyCompanyContext(request.headers);
    const result = await services.listFeedback(actor, companyId, input);
    return json({
      ...result,
      items: result.items.map((item) => ({
        ...item,
        attachment: item.attachmentId ? { id: item.attachmentId } : null,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
