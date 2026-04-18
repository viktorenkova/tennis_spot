CREATE TYPE "MatchRequestStatus" AS ENUM (
  'pending',
  'accepted',
  'declined',
  'cancelled'
);

CREATE TYPE "MatchRequestFormat" AS ENUM (
  'singles',
  'doubles'
);

ALTER TYPE "NotificationType" ADD VALUE 'match_request_created';
ALTER TYPE "NotificationType" ADD VALUE 'match_request_accepted';
ALTER TYPE "NotificationType" ADD VALUE 'match_request_declined';
ALTER TYPE "NotificationType" ADD VALUE 'match_request_cancelled';

ALTER TYPE "NotificationRelatedEntityType" ADD VALUE 'match_request';

CREATE TABLE "match_requests" (
  "id" UUID NOT NULL,
  "initiator_id" UUID NOT NULL,
  "opponent_id" UUID NOT NULL,
  "status" "MatchRequestStatus" NOT NULL DEFAULT 'pending',
  "proposed_date" DATE NOT NULL,
  "proposed_time_from" TEXT NOT NULL,
  "proposed_time_to" TEXT NOT NULL,
  "format" "MatchRequestFormat" NOT NULL,
  "message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "match_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "match_requests_initiator_id_status_created_at_idx"
  ON "match_requests"("initiator_id", "status", "created_at");

CREATE INDEX "match_requests_opponent_id_status_created_at_idx"
  ON "match_requests"("opponent_id", "status", "created_at");

ALTER TABLE "match_requests"
  ADD CONSTRAINT "match_requests_initiator_id_fkey"
  FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_requests"
  ADD CONSTRAINT "match_requests_opponent_id_fkey"
  FOREIGN KEY ("opponent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
