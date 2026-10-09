import type { AuthorizedCompany } from "../../companies/domain/access";

export type FeedbackStatus = "NEW" | "REVIEWING" | "DONE" | "ARCHIVED";
export type FeedbackType = "ISSUE" | "SUGGESTION" | "COMPLIMENT";
export type FeedbackQuery = Readonly<{
  q: string;
  page: number;
  pageSize?: number;
  siteId?: number;
  status?: FeedbackStatus;
  type?: FeedbackType;
  from?: string;
  to?: string;
}>;
export type FeedbackItem = Readonly<{
  id: string;
  message: string;
  type: FeedbackType;
  status: FeedbackStatus;
  siteId: number;
  createdAt: string;
  attachmentId: string | null;
}>;
export type FeedbackPage = Readonly<{
  items: readonly FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
}>;
export type NoteDto = Readonly<{
  id: string;
  body: string;
  author: Readonly<{ id: string; name: string }>;
  createdAt: string;
}>;
export type AttachmentMetadata = Readonly<{
  id: string;
  filename: string;
  mime: string;
  size: number;
}>;
export type FeedbackDetail = FeedbackItem &
  Readonly<{
    email: string | null;
    pageUrl: string | null;
    notes: readonly NoteDto[];
    attachment: AttachmentMetadata | null;
  }>;
export type StatusResult = Readonly<{ id: string; status: FeedbackStatus }>;
export type PrivateAttachment = Readonly<{
  key: string;
  mime: string;
  filename: string;
  size: number;
}>;

export interface FeedbackRepository {
  list(scope: AuthorizedCompany, query: FeedbackQuery): Promise<FeedbackPage>;
  detail(scope: AuthorizedCompany, id: string): Promise<FeedbackDetail | null>;
  setStatus(
    scope: AuthorizedCompany,
    id: string,
    status: FeedbackStatus,
  ): Promise<StatusResult | null>;
  addNote(scope: AuthorizedCompany, id: string, body: string): Promise<NoteDto | null>;
  attachment(scope: AuthorizedCompany, id: string): Promise<PrivateAttachment | null>;
}
