ALTER TYPE "NotificationType" ADD VALUE 'match_booking_created';

ALTER TABLE "booking_requests"
  ADD COLUMN "related_match_request_id" UUID;

CREATE UNIQUE INDEX "booking_requests_related_match_request_id_key"
  ON "booking_requests"("related_match_request_id");

ALTER TABLE "booking_requests"
  ADD CONSTRAINT "booking_requests_related_match_request_id_fkey"
  FOREIGN KEY ("related_match_request_id") REFERENCES "match_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
