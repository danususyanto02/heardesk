export type UserId = string;
export type Actor = Readonly<{
  userId: UserId;
  emailVerified: boolean;
  platformRole: "USER" | "PLATFORM_OWNER";
}>;
export interface SessionReader {
  current(): Promise<Actor | null>;
}
