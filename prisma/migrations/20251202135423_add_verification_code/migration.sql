-- AlterTable
ALTER TABLE "EmailVerificationToken" ADD COLUMN     "code" TEXT,
ALTER COLUMN "token" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "EmailVerificationToken_code_idx" ON "EmailVerificationToken"("code");
