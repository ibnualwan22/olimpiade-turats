-- Embargo hasil lomba (Opsi 2, 4 Nov 2026): nilai & peringkat attempt
-- selesai ditahan dari peserta sampai admin membuka via toggle
-- resultsVisible di halaman sesi (pengumuman resmi 5 Nov 2026).
-- Diterapkan langsung via psql ke olimpiade-db (bukan migrate deploy).
ALTER TABLE "ExamSession" ADD COLUMN IF NOT EXISTS "resultsVisible" BOOLEAN NOT NULL DEFAULT false;
