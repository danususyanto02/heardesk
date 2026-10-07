CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_OWNER');
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "user" ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "session" ADD COLUMN "activeOrganizationId" TEXT;

CREATE TABLE "organization" (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, logo TEXT, metadata TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "member" (
  id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organization"(id) ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON UPDATE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN','AGENT','VIEWER')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId", "userId")
);
CREATE INDEX "member_userId_idx" ON "member"("userId");
CREATE TABLE "invitation" (
  id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organization"(id) ON UPDATE CASCADE,
  email TEXT NOT NULL, role TEXT CHECK (role IN ('ADMIN','AGENT','VIEWER')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','canceled')),
  "inviterId" TEXT NOT NULL REFERENCES "user"(id) ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "invitation_organizationId_email_status_idx" ON "invitation"("organizationId",email,status);
CREATE TABLE "CompanyProfile" (
  "organizationId" TEXT PRIMARY KEY REFERENCES "organization"(id) ON UPDATE CASCADE,
  status "CompanyStatus" NOT NULL DEFAULT 'ACTIVE', "statusReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "CompanyLimits" (
  "companyId" TEXT PRIMARY KEY REFERENCES "organization"(id) ON UPDATE CASCADE,
  "websiteLimit" INTEGER NOT NULL CHECK ("websiteLimit" >= 0), "seatLimit" INTEGER NOT NULL CHECK ("seatLimit" >= 0),
  "monthlyReportLimit" INTEGER NOT NULL CHECK ("monthlyReportLimit" >= 0), "storageBytesLimit" BIGINT NOT NULL CHECK ("storageBytesLimit" >= 0)
);
CREATE TABLE "CompanyUsage" (
  "companyId" TEXT PRIMARY KEY REFERENCES "organization"(id) ON UPDATE CASCADE,
  "storedBytes" BIGINT NOT NULL DEFAULT 0 CHECK ("storedBytes" >= 0)
);
CREATE TABLE "ReportUsagePeriod" (
  "companyId" TEXT NOT NULL REFERENCES "organization"(id) ON UPDATE CASCADE,
  period TEXT NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0), PRIMARY KEY ("companyId",period)
);
CREATE TABLE "CompanyCreationRequest" (
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON UPDATE CASCADE, "idempotencyKey" TEXT NOT NULL,
  fingerprint TEXT NOT NULL, "companyId" TEXT NOT NULL REFERENCES "organization"(id) ON UPDATE CASCADE,
  PRIMARY KEY ("userId","idempotencyKey")
);
CREATE TABLE "AuditEvent" (
  id TEXT PRIMARY KEY, "actorId" TEXT REFERENCES "user"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  "actorSnapshot" TEXT NOT NULL, "companyId" TEXT REFERENCES "organization"(id) ON UPDATE CASCADE,
  action TEXT NOT NULL, "resourceId" TEXT NOT NULL, metadata JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditEvent_companyId_createdAt_idx" ON "AuditEvent"("companyId","createdAt");

ALTER TABLE "Site" ADD COLUMN "companyId" TEXT REFERENCES "organization"(id) ON UPDATE CASCADE;
ALTER TABLE "UploadReservation" ADD COLUMN "companyId" TEXT REFERENCES "organization"(id) ON UPDATE CASCADE;

DO $$
DECLARE owner_id TEXT; company_id TEXT;
BEGIN
  SELECT "adminId" INTO owner_id FROM "Installation" WHERE id = 1;
  IF owner_id IS NULL AND (EXISTS (SELECT 1 FROM "Site") OR EXISTS (SELECT 1 FROM "UploadReservation") OR EXISTS (SELECT 1 FROM "user")) THEN
    RAISE EXCEPTION 'Cannot infer Company owner without Installation. Repair orphan installation before migration.';
  END IF;
  IF owner_id IS NOT NULL THEN
    company_id := 'legacy-' || owner_id;
    INSERT INTO "organization" (id,name,slug) VALUES (company_id,'My Company','initial-company');
    INSERT INTO "member" (id,"organizationId","userId",role) VALUES ('legacy-member-' || owner_id,company_id,owner_id,'OWNER');
    INSERT INTO "CompanyProfile" ("organizationId","updatedAt") VALUES (company_id,CURRENT_TIMESTAMP);
    INSERT INTO "CompanyLimits" ("companyId","websiteLimit","seatLimit","monthlyReportLimit","storageBytesLimit") VALUES (company_id,0,0,0,0);
    INSERT INTO "CompanyUsage" ("companyId","storedBytes") SELECT company_id,COALESCE(SUM(size),0) FROM "Attachment";
    UPDATE "Site" SET "companyId" = company_id;
    UPDATE "UploadReservation" SET "companyId" = company_id;
    UPDATE "user" SET "platformRole" = 'PLATFORM_OWNER' WHERE id = owner_id;
    INSERT INTO "ReportUsagePeriod" ("companyId",period,count)
      SELECT company_id,to_char("createdAt",'YYYY-MM'),COUNT(*)::INTEGER FROM "Feedback" GROUP BY 2;
  END IF;
END $$;

ALTER TABLE "Site" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "UploadReservation" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Site" DROP CONSTRAINT "Site_singleton";
DROP INDEX "user_singleton_key";
ALTER TABLE "user" DROP CONSTRAINT "user_singleton_true";
ALTER TABLE "user" DROP COLUMN singleton;
CREATE SEQUENCE "Site_id_seq" OWNED BY "Site".id;
SELECT setval('"Site_id_seq"', COALESCE((SELECT MAX(id) FROM "Site"),0) + 1, false);
ALTER TABLE "Site" ALTER COLUMN id SET DEFAULT nextval('"Site_id_seq"');
CREATE UNIQUE INDEX "Site_companyId_origin_key" ON "Site"("companyId",origin);
CREATE INDEX "Site_companyId_idx" ON "Site"("companyId");
CREATE INDEX "UploadReservation_companyId_createdAt_idx" ON "UploadReservation"("companyId","createdAt");

CREATE TABLE "ReportReservation" (
  id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "organization"(id) ON UPDATE CASCADE,
  "siteId" INTEGER NOT NULL REFERENCES "Site"(id) ON UPDATE CASCADE, "submissionId" TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'), "expiresAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("siteId","submissionId")
);
CREATE INDEX "ReportReservation_companyId_period_idx" ON "ReportReservation"("companyId",period);
