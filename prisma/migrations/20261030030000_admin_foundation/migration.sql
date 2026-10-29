-- Pondasi admin: email peserta + log pengiriman kredensial.
-- Aditif saja (tidak ada kolom yang dihapus/diubah). Terapkan via psql ke
-- database olimpiade, lalu jalankan `npx prisma generate` sebelum build.
ALTER TABLE "User" ADD COLUMN "email" TEXT;

CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "EmailLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "EmailStatus" NOT NULL,
  "resendId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
