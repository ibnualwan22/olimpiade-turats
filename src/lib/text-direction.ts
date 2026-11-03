// Deteksi arah tulisan otomatis dari isi teks.
//
// Dipakai SAMA di halaman manajemen soal, daftar soal sesi, pratinjau impor,
// dan halaman ujian — jadi yang dilihat admin persis sama dengan yang dilihat
// peserta. Arah TIDAK lagi dibaca dari field direction tersimpan (field itu
// tetap ditulis saat simpan sebagai metadata, tapi tampilan tidak lagi
// bergantung padanya, sehingga soal lama yang tersimpan RTL pun tampil benar).
//
// Aturan: huruf kuat PERTAMA yang ditemui menentukan arah — semantik yang
// sama dengan dir="auto" di HTML:
//  - huruf Arab -> RTL (rentang Arab, tanpa digit Arab-Indic yang sifatnya
//    netral seperti angka biasa)
//  - huruf Latin -> LTR
//  - angka, spasi, tanda baca, dan tag HTML dilewati (bukan penentu arah)
//  - tidak ada huruf kuat sama sekali -> LTR (default aman untuk Indonesia)
//
// Konsekuensi untuk isi campuran (mis. pertanyaan Indonesia yang memuat kata
// Arab, atau sebaliknya): bahasa yang MEMBUKA teks menentukan arah paragraf,
// sedangkan potongan bahasa lain di dalamnya tetap dirender benar oleh
// algoritma bidi browser. Ini yang membuat soal Indonesia berisi kata Arab
// tampil LTR (bukan RTL seperti sebelumnya), dan soal Arab murni tetap RTL.
export type TextDirection = "RTL" | "LTR";

// Huruf Arab (tanpa digit Arab-Indic 0660-0669 & 06F0-06F9 yang netral).
const ARABIC_RE =
  /[\u0600-\u065F\u066A-\u06EF\u06FA-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
// Huruf Latin (dasar + Latin Extended, cukup untuk Indonesia).
const LATIN_RE = /[A-Za-z\u00C0-\u024F]/;

export function getTextDirection(content: string): TextDirection {
  // Kupas tag HTML (mis. <strong> dari impor) supaya tidak ikut dihitung:
  // tanpa ini, "<strong>..." akan terdeteksi Latin dari huruf "s".
  const text = (content || "").replace(/<[^>]*>/g, "");
  for (const ch of text) {
    if (ARABIC_RE.test(ch)) return "RTL";
    if (LATIN_RE.test(ch)) return "LTR";
  }
  return "LTR";
}
