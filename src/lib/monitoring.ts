// Helper murni untuk monitoring lomba. Dipakai API monitoring (hitungan
// per peserta + statistik per soal) dan rute ekspor Excel, supaya kedua
// tempat menghitung dengan definisi yang sama.
//
// Definisi jawaban:
// - dijawab  = baris jawaban dengan selectedOptionId terisi
// - benar    = opsi yang dipilih bertanda isCorrect
// - salah    = opsi yang dipilih ada tapi tidak bertanda isCorrect
// - kosong   = total soal sesi - dijawab (termasuk baris jawaban yang
//              opsinya dikosongkan lagi oleh peserta)

export type AnswerRowLike = {
  questionId: string;
  selectedOptionId: string | null;
  isDoubtful: boolean;
  answeredAt: Date;
  selectedOption: { isCorrect: boolean } | null;
};

export type AttemptCounts = {
  answered: number;
  correct: number;
  wrong: number;
  doubtful: number;
  lastAnsweredAt: Date | null;
};

export function countAnswers(answers: AnswerRowLike[]): AttemptCounts {
  let answered = 0;
  let correct = 0;
  let wrong = 0;
  let doubtful = 0;
  let lastAnsweredAt: Date | null = null;
  for (const a of answers) {
    if (a.isDoubtful) doubtful += 1;
    if (a.answeredAt && (!lastAnsweredAt || a.answeredAt > lastAnsweredAt)) {
      lastAnsweredAt = a.answeredAt;
    }
    if (!a.selectedOptionId) continue;
    answered += 1;
    if (a.selectedOption?.isCorrect) correct += 1;
    else wrong += 1;
  }
  return { answered, correct, wrong, doubtful, lastAnsweredAt };
}

// Urutan peringkat final, sama dengan aturan yang diiklankan: nilai
// tertinggi, lalu paling dulu selesai, lalu durasi tercepat.
export type Rankable = {
  finalScore: number;
  finishedAt: Date | null;
  timeSpentSeconds: number | null;
  tokenVerifiedAt: Date;
};

export function compareRank(a: Rankable, b: Rankable): number {
  if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
  const fa = a.finishedAt ? a.finishedAt.getTime() : Infinity;
  const fb = b.finishedAt ? b.finishedAt.getTime() : Infinity;
  if (fa !== fb) return fa - fb;
  const ta = a.timeSpentSeconds ?? Infinity;
  const tb = b.timeSpentSeconds ?? Infinity;
  if (ta !== tb) return ta - tb;
  return a.tokenVerifiedAt.getTime() - b.tokenVerifiedAt.getTime();
}

export function formatMenitDetik(totalDetik: number | null): string {
  if (totalDetik === null || totalDetik === undefined) return "-";
  const m = Math.floor(totalDetik / 60);
  const d = totalDetik % 60;
  return `${m}m ${d}d`;
}

// Judul sesi -> slug aman untuk nama file ekspor.
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sesi"
  );
}
