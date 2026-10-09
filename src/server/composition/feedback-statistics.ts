import type { PrismaClient } from "@/generated/prisma/client";
import type { Clock } from "@/modules/usage/domain/usage";
import { feedbackStatistics } from "@/modules/feedback/application/feedback-statistics";
import { prismaFeedbackStatistics } from "@/modules/feedback/infrastructure/prisma-feedback-statistics";
const defaultClock: Clock = { now: () => new Date() };
export function createFeedbackStatistics(db: PrismaClient, clock: Clock = defaultClock) {
  return feedbackStatistics(prismaFeedbackStatistics(db), clock);
}
