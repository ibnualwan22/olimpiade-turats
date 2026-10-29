import type { ReactNode } from "react";

// Render isi soal/opsi. Konten impor melewati sanitasi whitelist di
// src/lib/excel.ts (hanya <strong>, <u>, <em> yang dihasilkan), sedangkan
// soal lama tersimpan sebagai teks polos. Heuristik ini membedakan keduanya:
// bila ada tag hasil impor, render sebagai HTML; bila tidak, render teks
// polos seperti semula (sehingga karakter <, >, & pada soal lama tidak rusak).
export function renderRichText(content: string): ReactNode {
  if (/<(strong|u|em)>/.test(content)) {
    return <span dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return content;
}
