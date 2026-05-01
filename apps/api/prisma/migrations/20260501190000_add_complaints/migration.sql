CREATE TYPE "ComplaintType" AS ENUM (
  'no_show',
  'late_cancel',
  'bad_behavior',
  'court_issue',
  'other'
);

CREATE TYPE "ComplaintStatus" AS ENUM (
  'pending',
  'in_review',
  'resolved',
  'rejected'
);

ALTER TYPE "NotificationType" ADD VALUE 'complaint_created';
ALTER TYPE "NotificationType" ADD VALUE 'complaint_status_updated';

ALTER TYPE "NotificationRelatedEntityType" ADD VALUE 'complaint';

CREATE TABLE "complaints" (
  "id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "target_user_id" UUID,
  "related_booking_request_id" UUID,
  "related_match_request_id" UUID,
  "type" "ComplaintType" NOT NULL,
  "description" TEXT NOT NULL,
  "status" "ComplaintStatus" NOT NULL DEFAULT 'pending',
  "resolution_comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "complaints_created_by_user_id_created_at_idx"
  ON "complaints"("created_by_user_id", "created_at");

CREATE INDEX "complaints_target_user_id_idx"
  ON "complaints"("target_user_id");

CREATE INDEX "complaints_related_booking_request_id_idx"
  ON "complaints"("related_booking_request_id");

CREATE INDEX "complaints_related_match_request_id_idx"
  ON "complaints"("related_match_request_id");

CREATE INDEX "complaints_status_created_at_idx"
  ON "complaints"("status", "created_at");

CREATE INDEX "complaints_type_created_at_idx"
  ON "complaints"("type", "created_at");

ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_related_booking_request_id_fkey"
  FOREIGN KEY ("related_booking_request_id") REFERENCES "booking_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_related_match_request_id_fkey"
  FOREIGN KEY ("related_match_request_id") REFERENCES "match_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
