import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database Olimpiade Turats...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const participantPassword = await bcrypt.hash("peserta123", 10);

  // 1. Buat Akun Admin
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Administrator Olimpiade",
      passwordHash: adminPassword,
      role: "ADMIN",
      institution: "Panitia Pusat Olimpiade Turats",
      category: "Panitia",
    },
  });

  // 2. Buat Akun Peserta Contoh
  const participantsData = [
    {
      username: "peserta01",
      name: "Ahmad Zaki Al-Faruq",
      institution: "PP. Lirboyo Kediri",
      category: "Ulya (Tingkat Atas)",
      phone: "081234567801",
    },
    {
      username: "peserta02",
      name: "Fatimah Az-Zahra",
      institution: "PP. Al-Munawwir Krapyak",
      category: "Ulya (Tingkat Atas)",
      phone: "081234567802",
    },
    {
      username: "peserta03",
      name: "Muhammad ইবনu Malik",
      institution: "PP. Sidogiri Pasuruan",
      category: "Wustha (Tingkat Menengah)",
      phone: "081234567803",
    },
    {
      username: "peserta04",
      name: "Nabila Khairunnisa",
      institution: "PP. Darussalam Gontor",
      category: "Wustha (Tingkat Menengah)",
      phone: "081234567804",
    },
  ];

  for (const p of participantsData) {
    await prisma.user.upsert({
      where: { username: p.username },
      update: {},
      create: {
        ...p,
        passwordHash: participantPassword,
        role: "PARTICIPANT",
      },
    });
  }

  // 3. Buat Kategori Soal
  const catNahwu = await prisma.questionCategory.create({
    data: {
      name: "Ilmu Nahwu (النحو)",
      description: "Kaidah i'rab, marfu'at, manshubat, dan syarah Alfiyah Ibnu Malik",
    },
  });

  const catSharaf = await prisma.questionCategory.create({
    data: {
      name: "Ilmu Sharaf (الصرف)",
      description: "Tashrif istilahi, lughawi, bina', dan i'lal",
    },
  });

  const catFiqih = await prisma.questionCategory.create({
    data: {
      name: "Fiqih Syafi'i (الفقه الشافعي)",
      description: "Kajian kitab Fathul Qarib dan Fathul Mu'in",
    },
  });

  const catBalaghah = await prisma.questionCategory.create({
    data: {
      name: "Ilmu Balaghah (البلاغة)",
      description: "Ma'ani, Bayan, dan Badi' (Jauharul Maknun)",
    },
  });

  // Bersihkan soal lama jika seed dijalankan ulang
  await prisma.question.deleteMany({});
  await prisma.examSession.deleteMany({});

  // 4. Buat Bank Soal Berbahasa Arab (Turats)
  const questionsData = [
    {
      categoryId: catNahwu.id,
      direction: "RTL" as const,
      weight: 10,
      content:
        "قَالَ ابْنُ مَالِكٍ فِي الأَلْفِيَّةِ: «كَلاَمُنَا لَفْظٌ مُفِيدٌ كَاسْتَقِمْ ... وَاسْمٌ وَفِعْلٌ ثُمَّ حَرْفٌ الْكَلِمُ».\nمَا الْمُرَادُ بِـ (الْكَلِم) فِي قَوْلِ الْمُصَنِّفِ رَحِمَهُ اللهُ؟",
      explanation: "الكلم اسم جنس جمعي يتركب من ثلاث كلمات فأكثر سواء أفاد أم لم يفد.",
      options: [
        {
          label: "A",
          content: "مَا تَرَكَّبَ مِنْ ثَلاَثِ كَلِمَاتٍ فَأَكْثَرَ سَوَاءٌ أَفَادَ أَمْ لَمْ يُفِدْ",
          direction: "RTL" as const,
          isCorrect: true,
        },
        {
          label: "B",
          content: "اللَّفْظُ الْمُرَكَّبُ الْمُفِيدُ بِالْوَضْعِ الْعَرَبِيِّ فَقَطْ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "C",
          content: "الْقَوْلُ الْمُفْرَدُ الَّذِي يَدُلُّ عَلَى مَعْنًى فِي نَفْسِهِ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "D",
          content: "مَا تَرَكَّبَ مِنْ كَلِمَتَيْنِ فَقَطْ بِشَرْطِ الإِفَادَةِ التَّامَّةِ",
          direction: "RTL" as const,
          isCorrect: false,
        },
      ],
    },
    {
      categoryId: catNahwu.id,
      direction: "RTL" as const,
      weight: 10,
      content:
        "مَا هُوَ إِعْرَابُ كَلِمَةِ (أَبُوكَ) فِي قَوْلِنَا: «جَاءَ أَبُوكَ ذُو الْعِلْمِ النَّافِعِ»؟",
      explanation: "الأسماء الخمسة ترفع بالواو نيابة عن الضمة.",
      options: [
        {
          label: "A",
          content: "فَاعِلٌ مَرْفُوعٌ وَعَلاَمَةُ رَفْعِهِ الضَّمَّةُ الْمُقَدَّرَةُ عَلَى الْوَاوِ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "B",
          content: "فَاعِلٌ مَرْفُوعٌ وَعَلاَمَةُ رَفْعِهِ الْوَاوُ نِيَابَةً عَنِ الضَّمَّةِ لأَنَّهُ مِنَ الأَسْمَاءِ الْخَمْسَةِ",
          direction: "RTL" as const,
          isCorrect: true,
        },
        {
          label: "C",
          content: "مُبْتَدَأٌ مَرْفُوعٌ وَعَلاَمَةُ رَفْعِهِ الْوَاوُ لأَنَّهُ جَمْعُ مُذَكَّرٍ سَالِمٌ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "D",
          content: "نَائِبُ فَاعِلٍ مَرْفُوعٌ بِالأَلِفِ لأَنَّهُ مُثَنًّى",
          direction: "RTL" as const,
          isCorrect: false,
        },
      ],
    },
    {
      categoryId: catFiqih.id,
      direction: "RTL" as const,
      weight: 15,
      content:
        "فِي كِتَابِ «فَتْحِ الْقَرِيبِ الْمُجِيبِ»: فُرُوضُ الْوُضُوءِ سِتَّةُ أَشْيَاءَ. أَيُّ الْخِيَارَاتِ التَّالِيَةِ يَعُدُّ مِنْ سُنَنِ الْوُضُوءِ وَلَيْسَ مِنْ فُرُوضِهِ؟",
      explanation: "التسمية وغسل الكفين والمضمضة والاستنشاق ومسح جميع الرأس والأذنين من سنن الوضوء.",
      options: [
        {
          label: "A",
          content: "النِّيَّةُ عِنْدَ غَسْلِ أَوَّلِ جُزْءٍ مِنَ الْوَجْهِ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "B",
          content: "مَسْحُ بَعْضِ الرَّأْسِ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "C",
          content: "الْمَضْمَضَةُ وَالاِسْتِنْشَاقُ وَمَسْحُ الأُذُنَيْنِ",
          direction: "RTL" as const,
          isCorrect: true,
        },
        {
          label: "D",
          content: "التَّرْتِيبُ عَلَى مَا ذَكَرَهُ اللهُ تَعَالَى فِي الآيَةِ",
          direction: "RTL" as const,
          isCorrect: false,
        },
      ],
    },
    {
      categoryId: catSharaf.id,
      direction: "RTL" as const,
      weight: 10,
      content:
        "مَا هُوَ بِنَاءُ الْفِعْلِ «اسْتَغْفَرَ - يَسْتَغْفِرُ» وَمَا وَزْنُهُ الصَّرْفِيُّ؟",
      explanation: "استغفر أصله غفر، حرف صحيح ثلاثي مزيد بثلاثة أحرف على وزن استفعل.",
      options: [
        {
          label: "A",
          content: "بِنَاءٌ صَحِيحٌ سَالِمٌ، عَلَى وَزْنِ (اسْتَفْعَلَ - يَسْتَفْعِلُ)",
          direction: "RTL" as const,
          isCorrect: true,
        },
        {
          label: "B",
          content: "بِنَاءٌ مَهْمُوزُ الْفَاءِ، عَلَى وَزْنِ (افْتَعَلَ - يَفْتَعِلُ)",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "C",
          content: "بِنَاءٌ أَجْوَفُ وَاوِيٌّ، عَلَى وَزْنِ (انْفَعَلَ - يَنْفَعِلُ)",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "D",
          content: "بِنَاءٌ نَاقِصٌ يَائِيٌّ، عَلَى وَزْنِ (تَفَعَّلَ - يَتَفَعَّلُ)",
          direction: "RTL" as const,
          isCorrect: false,
        },
      ],
    },
    {
      categoryId: catBalaghah.id,
      direction: "RTL" as const,
      weight: 15,
      content:
        "فِي قَوْلِنَا: «زَيْدٌ كَالْأَسَدِ فِي الشَّجَاعَةِ»، مَا هُوَ (وَجْهُ الشَّبَهِ) فِي هَذَا التَّشْبِيهِ؟",
      explanation: "المشبه: زيد، المشبه به: الأسد، أداة التشبيه: الكاف، وجه الشبه: في الشجاعة.",
      options: [
        {
          label: "A",
          content: "زَيْدٌ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "B",
          content: "الْأَسَدُ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "C",
          content: "الْكَافُ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "D",
          content: "فِي الشَّجَاعَةِ",
          direction: "RTL" as const,
          isCorrect: true,
        },
      ],
    },
    {
      categoryId: catFiqih.id,
      direction: "RTL" as const,
      weight: 20,
      content:
        "قَالَ الْمُصَنِّفُ فِي فَتْحِ الْمعِينِ: «وَيَجِبُ قَضَاءُ فَوَائِتِ الصَّلاَةِ فَوْرًا إِنْ فَاتَتْ بِغَيْرِ عُذْرٍ».\nمَا حُكْمُ قَضَاءِ الصَّلاَةِ الَّتِي فَاتَتْ بِعُذْرٍ كَنَوْمٍ لَمْ يَتَعَدَّ بِهِ أَوْ نِسْيَانٍ؟",
      explanation: "إن فاتت بعذر كنوم أو نسيان لم يجب قضاؤها فورا بل يسن التعجيل به.",
      options: [
        {
          label: "A",
          content: "يَجِبُ قَضَاؤُهَا عَلَى التَّرَاخِي وَيُسَنُّ تَعْجِيلُهُ",
          direction: "RTL" as const,
          isCorrect: true,
        },
        {
          label: "B",
          content: "يَسْقُطُ قَضَاؤُهَا بِالْكُلِّيَّةِ وَتَجِبُ الْفِدْيَةُ فَقَطْ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "C",
          content: "يَحْرُمُ قَضَاؤُهَا فِي أَوْقَاتِ النَّهْيِ الْمُطْلَقَةِ",
          direction: "RTL" as const,
          isCorrect: false,
        },
        {
          label: "D",
          content: "يَجِبُ قَضَاؤُهَا فَوْرًا وَيَأْثَمُ بِتَأْخِيرِهَا لَحْظَةً",
          direction: "RTL" as const,
          isCorrect: false,
        },
      ],
    },
  ];

  const createdQuestions = [];
  for (const qData of questionsData) {
    const q = await prisma.question.create({
      data: {
        categoryId: qData.categoryId,
        direction: qData.direction,
        weight: qData.weight,
        content: qData.content,
        explanation: qData.explanation,
        options: {
          create: qData.options,
        },
      },
    });
    createdQuestions.push(q);
  }

  // 5. Buat Sesi Ujian Contoh
  const defaultRules = `1. Peserta wajib membaca Basmalah dan berdoa sebelum memulai perlombaan.
2. Waktu pengerjaan dimulai secara otomatis sejak Anda menekan tombol "Mulai Kerjakan Sekarang".
3. Setiap soal memiliki bobot nilai tersendiri sesuai tingkat kesulitan maqra' / soal.
4. Peserta yang menyelesaikan ujian lebih cepat dengan tingkat ketepatan jawaban yang tinggi akan memperoleh Bonus Poin Kecepatan (Speed Bonus).
5. Dilarang membuka kamus, kitab referensi, atau bekerja sama dengan pihak lain selama sesi berlangsung.
6. Jawaban Anda tersimpan secara otomatis setiap kali memilih opsi. Pastikan menekan tombol "Selesai & Kumpulkan" sebelum waktu habis.`;

  const session = await prisma.examSession.create({
    data: {
      title: "Babak Penyisihan Olimpiade Turats Nasional 2026",
      description:
        "Sesi ujian utama mencakup materi Ilmu Nahwu, Sharaf, Fiqih Syafi'i, dan Balaghah berbasis kitab kuning.",
      rulesContent: defaultRules,
      accessToken: "TURATS2026",
      durationMinutes: 45,
      isActive: true,
      shuffleQuestions: true,
      shuffleOptions: false,
      wrongPenalty: 0,
      speedScoringMode: "BONUS_POINTS",
      maxSpeedBonus: 20,
      questions: {
        create: createdQuestions.map((q, idx) => ({
          questionId: q.id,
          orderIndex: idx + 1,
        })),
      },
    },
  });

  console.log("✅ Seeding selesai!");
  console.log(`   - Admin Login   : admin / admin123`);
  console.log(`   - Peserta Login : peserta01 / peserta123 (s/d peserta04)`);
  console.log(`   - Token Sesi    : ${session.accessToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

