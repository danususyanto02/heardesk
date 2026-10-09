import { legacyCompanyContext } from "@/server/company-context";
import { attachmentBytes } from "@/server/storage";
import { failure, privateHeaders } from "@/server/http";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor, companyId, services } = await legacyCompanyContext(request.headers);
    const { id } = await params;
    const item = await services.attachment(actor, companyId, id);
    const bytes = await attachmentBytes(item.key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/webp",
        "Content-Disposition": 'inline; filename="screenshot.webp"',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
