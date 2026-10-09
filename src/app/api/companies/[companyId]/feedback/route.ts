import { companyApi, feedbackQueryInput } from "@/server/company-api";
import { failure, json } from "@/server/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await params;
    const { actor, services } = await companyApi(request, companyId);
    return json(
      await services.listFeedback(
        actor,
        companyId,
        feedbackQueryInput.parse(Object.fromEntries(new URL(request.url).searchParams)),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
