import { companyApi } from "@/server/company-api";
import { attachmentBytes } from "@/server/storage";
import { failure, privateHeaders } from "@/server/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string; attachmentId: string }> },
) {
  try {
    const { companyId, attachmentId } = await params;
    const { actor, services } = await companyApi(request, companyId);
    const item = await services.attachment(actor, companyId, attachmentId);
    return new Response(new Uint8Array(await attachmentBytes(item.key)), {
      headers: {
        ...privateHeaders,
        "Content-Type": item.mime,
        "Content-Disposition": 'inline; filename="screenshot.webp"',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
