-- AlterTable
ALTER TABLE "project_expenses" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project_expenses" ADD COLUMN IF NOT EXISTS "deductFromCustody" BOOLEAN NOT NULL DEFAULT false;
