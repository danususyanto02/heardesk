import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { Actor } from "../../identity/domain/session";
import { createCompanyAccess } from "../../companies/infrastructure/prisma-company-access";
import type { Clock } from "../domain/usage";
import { occupiedSeats, invitationAcceptable } from "../domain/seat-policy";
import { validInvitationEmail } from "../../shared/domain/email";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}
async function occupied(tx: Prisma.TransactionClient, companyId: string, now: Date) {
  const members = await tx.member.findMany({
    where: { organizationId: companyId },
    include: { user: { select: { email: true } } },
  });
  const invites = await tx.invitation.findMany({
    where: { organizationId: companyId, status: "pending", expiresAt: { gt: now } },
  });
  return occupiedSeats(
    members.map((member) => ({ id: member.id, email: member.user.email })),
    invites,
    now,
  );
}
export async function reserveInvitationSeat(
  db: PrismaClient,
  actor: Actor,
  companyId: string,
  emailInput: string,
  role: "ADMIN" | "AGENT" | "VIEWER",
  clock: Clock,
) {
  const email = emailInput.trim().toLowerCase();
  if (!["ADMIN", "AGENT", "VIEWER"].includes(role)) {
    fail("INVITATION_ROLE_INVALID");
  }
  if (!validInvitationEmail(email)) {
    fail("INVITATION_EMAIL_INVALID");
  }
  return createCompanyAccess(db).write(
    actor,
    companyId,
    "team:manage-non-owner",
    async (_scope, tx) => {
      const now = clock.now();
      if (
        await tx.member.findFirst({
          where: {
            organizationId: companyId,
            user: { email: { equals: email, mode: "insensitive" } },
          },
        })
      ) {
        fail("ALREADY_MEMBER");
      }
      const held = await tx.invitation.findFirst({
        where: { organizationId: companyId, email, status: "pending", expiresAt: { gt: now } },
      });
      if (held) {
        return held;
      }
      const limits = await tx.companyLimits.findUniqueOrThrow({ where: { companyId } });
      if ((await occupied(tx, companyId, now)) >= limits.seatLimit) {
        fail("COMPANY_QUOTA_EXCEEDED");
      }
      const invitation = await tx.invitation.create({
        data: {
          id: randomUUID(),
          organizationId: companyId,
          email,
          role,
          inviterId: actor.userId,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: actor.userId,
          actorSnapshot: actor.userId,
          companyId,
          action: "MEMBER_INVITED",
          resourceId: invitation.id,
        },
      });
      return invitation;
    },
  );
}
export async function revokeReservedSeat(
  db: PrismaClient,
  actor: Actor,
  companyId: string,
  invitationId: string,
  _now: Date,
) {
  return createCompanyAccess(db).write(
    actor,
    companyId,
    "team:manage-non-owner",
    async (_scope, tx) => {
      const invite = await tx.invitation.findFirst({
        where: { id: invitationId, organizationId: companyId, status: "pending" },
      });
      if (!invite) {
        fail("INVITATION_INVALID");
      }
      await tx.invitation.update({ where: { id: invitationId }, data: { status: "canceled" } });
      await tx.auditEvent.create({
        data: {
          actorId: actor.userId,
          actorSnapshot: actor.userId,
          companyId,
          action: "INVITATION_REVOKED",
          resourceId: invitationId,
        },
      });
    },
  );
}
export async function acceptReservedSeat(
  db: PrismaClient,
  actor: Actor,
  companyId: string,
  invitationId: string,
  clock: Clock,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${companyId} FOR UPDATE`;
    const now = clock.now();
    const user = await tx.user.findUnique({ where: { id: actor.userId } });
    if (!user?.emailVerified) {
      fail("EMAIL_NOT_VERIFIED");
    }
    const invite = await tx.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: companyId,
        status: "pending",
        expiresAt: { gt: now },
        email: { equals: user.email, mode: "insensitive" },
      },
    });
    if (!invite || !invitationAcceptable(invite, user.email, now)) {
      fail("INVITATION_INVALID");
    }
    const profile = await tx.companyProfile.findUniqueOrThrow({
      where: { organizationId: companyId },
    });
    if (profile.status !== "ACTIVE") {
      fail("COMPANY_SUSPENDED");
    }
    if (
      await tx.member.findUnique({
        where: { organizationId_userId: { organizationId: companyId, userId: actor.userId } },
      })
    ) {
      fail("INVITATION_INVALID");
    }
    const limits = await tx.companyLimits.findUniqueOrThrow({ where: { companyId } });
    if ((await occupied(tx, companyId, now)) > limits.seatLimit) {
      fail("COMPANY_QUOTA_EXCEEDED");
    }
    const member = await tx.member.create({
      data: { id: randomUUID(), organizationId: companyId, userId: user.id, role: invite.role! },
    });
    await tx.invitation.update({ where: { id: invitationId }, data: { status: "accepted" } });
    await tx.auditEvent.create({
      data: {
        actorId: actor.userId,
        actorSnapshot: actor.userId,
        companyId,
        action: "INVITATION_ACCEPTED",
        resourceId: invitationId,
      },
    });
    return member;
  });
}
