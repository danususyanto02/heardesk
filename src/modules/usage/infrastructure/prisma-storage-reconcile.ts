import type { PrismaClient } from "@/generated/prisma/client";

export interface ReconcileFiles {
  discard(key: string): Promise<void>;
  list(): Promise<readonly { key: string; modifiedAt: Date }[]>;
}
export async function reconcileCompanyStorage(
  db: PrismaClient,
  files: ReconcileFiles,
  now: Date,
): Promise<{ removed: number }> {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" ORDER BY "organizationId" FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(178232)`;
      const attached = await tx.attachment.findMany({
        select: {
          key: true,
          size: true,
          feedback: { select: { site: { select: { companyId: true } } } },
        },
      });
      const keys = new Set(attached.map((row) => row.key));
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      for (const reservation of await tx.uploadReservation.findMany({
        where: { createdAt: { lt: cutoff } },
      })) {
        if (!keys.has(reservation.id + ".webp")) {
          await files.discard(reservation.id + ".webp");
        }
        await tx.uploadReservation.delete({ where: { id: reservation.id } });
      }
      const live = new Set(
        (await tx.uploadReservation.findMany({ select: { id: true } })).map(
          (row) => row.id + ".webp",
        ),
      );
      let removed = 0;
      for (const file of await files.list()) {
        if (!keys.has(file.key) && !live.has(file.key) && file.modifiedAt < cutoff) {
          await files.discard(file.key);
          removed++;
        }
      }
      const used = attached.reduce((total, row) => total + BigInt(row.size), 0n);
      await tx.storageBudget.upsert({
        where: { id: 1 },
        create: { id: 1, used },
        update: { used },
      });
      for (const company of await tx.organization.findMany({ select: { id: true } })) {
        const storedBytes = attached
          .filter((row) => row.feedback.site.companyId === company.id)
          .reduce((total, row) => total + BigInt(row.size), 0n);
        await tx.companyUsage.upsert({
          where: { companyId: company.id },
          create: { companyId: company.id, storedBytes },
          update: { storedBytes },
        });
      }
      await tx.reportReservation.deleteMany({ where: { expiresAt: { lte: now } } });
      return { removed };
    },
    { timeout: 60000 },
  );
}
