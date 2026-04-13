-- AlterTable
ALTER TABLE "venues"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "courts"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
