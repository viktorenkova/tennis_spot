UPDATE "court_schedule_templates"
SET "weekday" = 0
WHERE "weekday" = 7;

ALTER TABLE "court_schedule_templates"
ADD CONSTRAINT "court_schedule_templates_weekday_check"
CHECK ("weekday" >= 0 AND "weekday" <= 6);
