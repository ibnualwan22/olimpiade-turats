-- Hapus total kolom kategori peserta (User.category) — gas 30 Okt 2026.
-- Kolom email (pondasi admin) tidak disentuh.
-- Diterapkan via psql saat deploy (pola migrasi dokumentasi proyek ini).
ALTER TABLE "User" DROP COLUMN "category";
