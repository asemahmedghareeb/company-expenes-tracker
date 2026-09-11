-- AlterTable
ALTER TABLE "client_payments" ADD COLUMN "receivedByPartnerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "client_payments_receivedByPartnerId_idx" ON "client_payments"("receivedByPartnerId");

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_receivedByPartnerId_fkey" FOREIGN KEY ("receivedByPartnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
