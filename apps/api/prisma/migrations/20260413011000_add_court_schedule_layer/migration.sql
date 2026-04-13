-- CreateEnum
CREATE TYPE "ScheduleExceptionType" AS ENUM ('closed', 'custom_hours', 'blocked', 'custom_price');

-- CreateTable
CREATE TABLE "court_schedule_templates" (
    "id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "time_from" TEXT NOT NULL,
    "time_to" TEXT NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "base_price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_schedule_exceptions" (
    "id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "exception_type" "ScheduleExceptionType" NOT NULL,
    "time_from" TEXT,
    "time_to" TEXT,
    "custom_price" DECIMAL(10,2),
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "court_schedule_templates_court_id_weekday_idx" ON "court_schedule_templates"("court_id", "weekday");

-- CreateIndex
CREATE INDEX "court_schedule_exceptions_court_id_date_idx" ON "court_schedule_exceptions"("court_id", "date");

-- AddForeignKey
ALTER TABLE "court_schedule_templates"
ADD CONSTRAINT "court_schedule_templates_court_id_fkey"
FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_schedule_exceptions"
ADD CONSTRAINT "court_schedule_exceptions_court_id_fkey"
FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
