import type { PrismaClient } from "@/generated/prisma/client";
import { trackingHash } from "./tracking-code";

export async function trackedFeedback(db: PrismaClient, code: string) {
  const row = await db.feedback.findFirst({
    where: {
      trackingHash: trackingHash(code),
      site: { company: { profile: { status: "ACTIVE" } } },
    },
    select: {
      message: true,
      type: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      site: { select: { name: true } },
      publicReplies: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, body: true, createdAt: true },
      },
    },
  });
  if (!row) {
    return null;
  }
  return {
    website: row.site.name,
    message: row.message,
    type: row.type,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    replies: row.publicReplies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      createdAt: reply.createdAt.toISOString(),
    })),
  };
}
