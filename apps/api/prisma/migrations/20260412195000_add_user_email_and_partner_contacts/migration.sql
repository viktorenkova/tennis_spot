ALTER TABLE "users"
ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

ALTER TABLE "partner_profiles"
ADD COLUMN "contact_phone" TEXT,
ADD COLUMN "contact_email" TEXT,
ADD COLUMN "tax_id" TEXT,
ADD COLUMN "legal_address" TEXT,
ADD COLUMN "actual_address" TEXT;
