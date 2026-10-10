export type Actor = Readonly<{
  userId: string;
  emailVerified: boolean;
  platformRole: "USER" | "PLATFORM_OWNER";
}>;
export interface SessionReader {
  current(): Promise<Actor | null>;
}
