CREATE TYPE "NotificationType" AS ENUM (
  'verification_submitted',
  'verification_approved',
  'verification_rejected',
  'verification_needs_correction',
  'booking_created',
  'booking_confirmed',
  'booking_rejected',
  'booking_cancelled',
  'booking_completed'
);

CREATE TYPE "NotificationRelatedEntityType" AS ENUM (
  'verification_request',
  'booking_request'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "related_entity_type" "NotificationRelatedEntityType",
  "related_entity_id" UUID,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_is_read_created_at_idx"
  ON "notifications"("user_id", "is_read", "created_at");

CREATE INDEX "notifications_related_entity_type_related_entity_id_idx"
  ON "notifications"("related_entity_type", "related_entity_id");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
