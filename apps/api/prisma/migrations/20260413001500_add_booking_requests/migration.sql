-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM (
    'draft',
    'pending',
    'confirmed',
    'rejected',
    'cancelled_by_player',
    'cancelled_by_partner',
    'expired',
    'completed'
);

-- CreateTable
CREATE TABLE "booking_requests" (
    "id" UUID NOT NULL,
    "player_profile_id" UUID NOT NULL,
    "partner_profile_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "booking_date" DATE NOT NULL,
    "time_from" TEXT NOT NULL,
    "time_to" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "players_count" INTEGER NOT NULL DEFAULT 2,
    "comment_from_player" TEXT,
    "comment_from_partner" TEXT,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_request_status_history" (
    "id" UUID NOT NULL,
    "booking_request_id" UUID NOT NULL,
    "old_status" "BookingRequestStatus",
    "new_status" "BookingRequestStatus" NOT NULL,
    "changed_by_user_id" UUID,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_requests_player_profile_id_idx" ON "booking_requests"("player_profile_id");

-- CreateIndex
CREATE INDEX "booking_requests_partner_profile_id_idx" ON "booking_requests"("partner_profile_id");

-- CreateIndex
CREATE INDEX "booking_requests_venue_id_idx" ON "booking_requests"("venue_id");

-- CreateIndex
CREATE INDEX "booking_requests_court_id_idx" ON "booking_requests"("court_id");

-- CreateIndex
CREATE INDEX "booking_requests_status_booking_date_idx" ON "booking_requests"("status", "booking_date");

-- CreateIndex
CREATE INDEX "booking_request_status_history_booking_request_id_idx" ON "booking_request_status_history"("booking_request_id");

-- CreateIndex
CREATE INDEX "booking_request_status_history_changed_by_user_id_idx" ON "booking_request_status_history"("changed_by_user_id");

-- AddForeignKey
ALTER TABLE "booking_requests"
ADD CONSTRAINT "booking_requests_player_profile_id_fkey"
FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests"
ADD CONSTRAINT "booking_requests_partner_profile_id_fkey"
FOREIGN KEY ("partner_profile_id") REFERENCES "partner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests"
ADD CONSTRAINT "booking_requests_venue_id_fkey"
FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests"
ADD CONSTRAINT "booking_requests_court_id_fkey"
FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_request_status_history"
ADD CONSTRAINT "booking_request_status_history_booking_request_id_fkey"
FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_request_status_history"
ADD CONSTRAINT "booking_request_status_history_changed_by_user_id_fkey"
FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
