import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { ActivityReader } from "../domain/activity";
export function prismaActivity(db: PrismaClient): ActivityReader {
  async function authorized<T>(
    actorId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: actorId },
        select: { platformRole: true, emailVerified: true, accountStatus: true },
      });
      if (
        user?.platformRole !== "PLATFORM_OWNER" ||
        !user.emailVerified ||
        user.accountStatus !== "ACTIVE"
      ) {
        throw Object.assign(new Error("Platform access denied"), { code: "PLATFORM_FORBIDDEN" });
      }
      return work(tx);
    });
  }
  return {
    counts: (actorId, start, end) =>
      authorized(actorId, async (tx) => {
        const rows = await tx.$queryRaw<
          { day: string; count: bigint }[]
        >`SELECT to_char("createdAt",'YYYY-MM-DD') AS day,count(*) AS count FROM "Feedback" WHERE "createdAt" >= ${start} AND "createdAt" < ${end} GROUP BY 1 ORDER BY 1`;
        return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
      }),
    years: (actorId) =>
      authorized(actorId, async (tx) =>
        (
          await tx.$queryRaw<
            { year: number }[]
          >`SELECT DISTINCT EXTRACT(YEAR FROM "createdAt")::integer AS year FROM "Feedback" ORDER BY 1 DESC`
        ).map((row) => row.year),
      ),
  };
}
