-- Upgrade monitoring lomba (31 Okt 2026): sinyal aktivitas peserta.
-- Diterapkan langsung via psql (ALTER TABLE), file ini dokumentasi saja,
-- mengikuti pola migrasi sebelumnya di proyek ini.
ALTER TABLE "ExamAttempt" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMPTZ;
