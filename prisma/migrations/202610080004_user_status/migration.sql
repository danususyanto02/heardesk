ALTER TABLE "user" ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "user" ADD CONSTRAINT "user_accountStatus_check" CHECK ("accountStatus" IN ('ACTIVE','SUSPENDED'));
CREATE FUNCTION heardesk_active_session_user() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE status TEXT;
BEGIN
  SELECT "accountStatus" INTO status FROM "user" WHERE id=NEW."userId" FOR SHARE;
  IF status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Account suspended' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER heardesk_active_session_user BEFORE INSERT ON "session" FOR EACH ROW EXECUTE FUNCTION heardesk_active_session_user();
