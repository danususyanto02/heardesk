import type { SessionReader } from "../../identity/domain/session";
import { requirePlatformOwner } from "../../identity/application/require-platform-owner";
import type {
  PlatformRepository,
  PlatformQuery,
  StatusChange,
  LimitsChange,
} from "../domain/platform-repository";
import { pagination } from "../../shared/domain/pagination";

function invalid(): never {
  throw Object.assign(new Error("Check platform action details."), {
    code: "PLATFORM_INPUT_INVALID",
  });
}
function validateQuery(query: PlatformQuery): PlatformQuery {
  if (
    typeof query.q !== "string" ||
    query.q.length > 200 ||
    !Number.isInteger(query.page) ||
    query.page < 1 ||
    query.page > 100000
  ) {
    invalid();
  }
  pagination(0, query.page, query.pageSize);
  return { q: query.q.trim(), page: query.page, pageSize: query.pageSize ?? 25 };
}
function validateChange(input: { reason: string; expectedUpdatedAt: string }) {
  if (
    typeof input.reason !== "string" ||
    !input.reason.trim() ||
    input.reason.trim().length > 500 ||
    !Number.isFinite(Date.parse(input.expectedUpdatedAt))
  ) {
    invalid();
  }
}
export function platformDashboard(repository: PlatformRepository, session: SessionReader) {
  async function actor() {
    return (await requirePlatformOwner(session)).userId;
  }
  return {
    overview: async () => repository.overview(await actor()),
    companies: async (query: PlatformQuery) =>
      repository.companies(await actor(), validateQuery(query)),
    company: async (id: string) => repository.company(await actor(), id),
    users: async (query: PlatformQuery) => repository.users(await actor(), validateQuery(query)),
    audit: async (query: PlatformQuery) => repository.audit(await actor(), validateQuery(query)),
    async setStatus(id: string, input: StatusChange) {
      const actorId = await actor();
      validateChange(input);
      if (!["ACTIVE", "SUSPENDED"].includes(input.status)) {
        invalid();
      }
      return repository.setStatus(actorId, id, { ...input, reason: input.reason.trim() });
    },
    async setLimits(id: string, input: LimitsChange) {
      const actorId = await actor();
      validateChange(input);
      if (
        ![input.websites, input.seats, input.monthlyReports].every(
          (value) => Number.isInteger(value) && value >= 0 && value <= 2147483647,
        ) ||
        typeof input.storageBytes !== "string" ||
        !/^\d{1,19}$/.test(input.storageBytes) ||
        BigInt(input.storageBytes) > 9223372036854775807n
      ) {
        invalid();
      }
      return repository.setLimits(actorId, id, {
        ...input,
        reason: input.reason.trim(),
        storageBytes: BigInt(input.storageBytes).toString(),
      });
    },
  };
}
