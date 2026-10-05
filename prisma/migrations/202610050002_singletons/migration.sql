ALTER TABLE "Installation" ADD CONSTRAINT "Installation_singleton" CHECK (id = 1);
ALTER TABLE "Site" ADD CONSTRAINT "Site_singleton" CHECK (id = 1);
ALTER TABLE "StorageBudget" ADD CONSTRAINT "StorageBudget_singleton" CHECK (id = 1);
ALTER TABLE "Site" ADD CONSTRAINT "Site_position" CHECK (position IN ('left', 'right'));
ALTER TABLE "user" ADD COLUMN "singleton" boolean NOT NULL DEFAULT true;
ALTER TABLE "user" ADD CONSTRAINT "user_singleton_true" CHECK (singleton = true);
CREATE UNIQUE INDEX "user_singleton_key" ON "user" (singleton);
