import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { UserOperations } from "../domain/user-operations";
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
export function prismaUserOperations(db: PrismaClient): UserOperations {
  async function authorize(tx: Prisma.TransactionClient, actorId: string) {
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { platformRole: true, emailVerified: true, accountStatus: true } });
    if (actor?.platformRole !== "PLATFORM_OWNER" || !actor.emailVerified || actor.accountStatus !== "ACTIVE") fail("PLATFORM_FORBIDDEN");
  }
  return {
    detail: (actorId, userId) => db.$transaction(async tx => {
      await authorize(tx, actorId);
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id:true,name:true,email:true,emailVerified:true,platformRole:true,accountStatus:true,createdAt:true,memberships:{take:100,select:{role:true,organization:{select:{id:true,name:true}}}} } });
      if (!user) fail("PLATFORM_NOT_FOUND");
      return { id:user.id,name:user.name,email:user.email,emailVerified:user.emailVerified,platformRole:user.platformRole,accountStatus:user.accountStatus,createdAt:user.createdAt.toISOString(),companies:user.memberships.map(member=>({...member.organization,role:member.role})) };
    }),
    change: (actorId,userId,action,reason) => db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "user" WHERE id IN (${actorId},${userId}) ORDER BY id FOR UPDATE`;
      await authorize(tx,actorId);
      const target = await tx.user.findUnique({where:{id:userId},select:{platformRole:true}});
      if(!target) fail("PLATFORM_NOT_FOUND");
      if(target.platformRole === "PLATFORM_OWNER" && action !== "REVOKE_SESSIONS") fail("PLATFORM_OWNER_PROTECTED");
      if(action !== "REVOKE_SESSIONS") await tx.user.update({where:{id:userId},data:{accountStatus:action === "SUSPEND" ? "SUSPENDED":"ACTIVE"}});
      if(action !== "REACTIVATE") await tx.session.deleteMany({where:{userId}});
      await tx.auditEvent.create({data:{actorId,actorSnapshot:actorId,action:action === "SUSPEND" ? "USER_SUSPENDED":action === "REACTIVATE" ? "USER_REACTIVATED":"USER_SESSIONS_REVOKED",resourceId:userId,metadata:{reason}}});
    }),
  };
}
