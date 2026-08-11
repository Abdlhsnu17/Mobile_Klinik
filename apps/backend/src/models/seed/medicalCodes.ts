import type { MedicalCode } from "../../types"

const SEED_TIMESTAMP = "2026-01-01T00:00:00.000Z"

type SeedCode = Pick<MedicalCode, "system" | "code" | "name" | "category">

// Diagnosa ICD-10 yang paling sering ditemui pada layanan klinik/puskesmas primer di Indonesia.
const icd10: SeedCode[] = [
  { system: "icd10", code: "J00", name: "Nasofaringitis akut (common cold)", category: "Sistem Pernapasan" },
  { system: "icd10", code: "J02.9", name: "Faringitis akut, tidak dijelaskan", category: "Sistem Pernapasan" },
  { system: "icd10", code: "J03.9", name: "Tonsilitis akut, tidak dijelaskan", category: "Sistem Pernapasan" },
  { system: "icd10", code: "J06.9", name: "Infeksi saluran pernapasan atas akut, tidak dijelaskan (ISPA)", category: "Sistem Pernapasan" },
  { system: "icd10", code: "J18.9", name: "Pneumonia, organisme tidak dijelaskan", category: "Sistem Pernapasan" },
  { system: "icd10", code: "J45.9", name: "Asma, tidak dijelaskan", category: "Sistem Pernapasan" },
  { system: "icd10", code: "A09", name: "Diare dan gastroenteritis dugaan infeksi", category: "Sistem Pencernaan" },
  { system: "icd10", code: "K29.7", name: "Gastritis, tidak dijelaskan", category: "Sistem Pencernaan" },
  { system: "icd10", code: "K30", name: "Dispepsia fungsional", category: "Sistem Pencernaan" },
  { system: "icd10", code: "K59.0", name: "Konstipasi", category: "Sistem Pencernaan" },
  { system: "icd10", code: "B34.9", name: "Infeksi virus, tidak dijelaskan", category: "Penyakit Infeksi" },
  { system: "icd10", code: "A15.0", name: "Tuberkulosis paru, terkonfirmasi", category: "Penyakit Infeksi" },
  { system: "icd10", code: "A90", name: "Demam dengue (DF)", category: "Penyakit Infeksi" },
  { system: "icd10", code: "A91", name: "Demam berdarah dengue (DBD)", category: "Penyakit Infeksi" },
  { system: "icd10", code: "B54", name: "Malaria, tidak dijelaskan", category: "Penyakit Infeksi" },
  { system: "icd10", code: "A01.0", name: "Demam tifoid", category: "Penyakit Infeksi" },
  { system: "icd10", code: "I10", name: "Hipertensi esensial (primer)", category: "Sistem Sirkulasi" },
  { system: "icd10", code: "I11.9", name: "Penyakit jantung hipertensi tanpa gagal jantung", category: "Sistem Sirkulasi" },
  { system: "icd10", code: "E11.9", name: "Diabetes melitus tipe 2 tanpa komplikasi", category: "Endokrin & Metabolik" },
  { system: "icd10", code: "E10.9", name: "Diabetes melitus tipe 1 tanpa komplikasi", category: "Endokrin & Metabolik" },
  { system: "icd10", code: "E78.5", name: "Hiperlipidemia, tidak dijelaskan", category: "Endokrin & Metabolik" },
  { system: "icd10", code: "E66.9", name: "Obesitas, tidak dijelaskan", category: "Endokrin & Metabolik" },
  { system: "icd10", code: "M54.5", name: "Nyeri punggung bawah (low back pain)", category: "Muskuloskeletal" },
  { system: "icd10", code: "M79.1", name: "Mialgia", category: "Muskuloskeletal" },
  { system: "icd10", code: "M25.5", name: "Nyeri sendi", category: "Muskuloskeletal" },
  { system: "icd10", code: "R51", name: "Sakit kepala (cephalgia)", category: "Gejala & Tanda" },
  { system: "icd10", code: "R50.9", name: "Demam, tidak dijelaskan", category: "Gejala & Tanda" },
  { system: "icd10", code: "R11", name: "Mual dan muntah", category: "Gejala & Tanda" },
  { system: "icd10", code: "R05", name: "Batuk", category: "Gejala & Tanda" },
  { system: "icd10", code: "L23.9", name: "Dermatitis kontak alergi, penyebab tidak dijelaskan", category: "Kulit" },
  { system: "icd10", code: "L30.9", name: "Dermatitis, tidak dijelaskan", category: "Kulit" },
  { system: "icd10", code: "B35.9", name: "Dermatofitosis (jamur kulit), tidak dijelaskan", category: "Kulit" },
  { system: "icd10", code: "H10.9", name: "Konjungtivitis, tidak dijelaskan", category: "Mata & THT" },
  { system: "icd10", code: "H66.9", name: "Otitis media, tidak dijelaskan", category: "Mata & THT" },
  { system: "icd10", code: "N39.0", name: "Infeksi saluran kemih, lokasi tidak dijelaskan (ISK)", category: "Sistem Kemih" },
  { system: "icd10", code: "K02.9", name: "Karies gigi, tidak dijelaskan", category: "Gigi & Mulut" },
  { system: "icd10", code: "O80", name: "Persalinan tunggal spontan", category: "Kehamilan & Persalinan" },
  { system: "icd10", code: "Z34.9", name: "Pengawasan kehamilan normal (ANC)", category: "Kehamilan & Persalinan" },
  { system: "icd10", code: "D64.9", name: "Anemia, tidak dijelaskan", category: "Darah" },
  { system: "icd10", code: "F41.9", name: "Gangguan kecemasan, tidak dijelaskan", category: "Jiwa & Perilaku" },
]

// Tindakan/prosedur ICD-9-CM yang umum dilakukan di layanan primer.
const icd9cm: SeedCode[] = [
  { system: "icd9cm", code: "89.7", name: "Pemeriksaan fisik umum", category: "Pemeriksaan" },
  { system: "icd9cm", code: "89.03", name: "Anamnesis dan evaluasi menyeluruh", category: "Pemeriksaan" },
  { system: "icd9cm", code: "93.94", name: "Terapi nebulizer/inhalasi", category: "Terapi Respirasi" },
  { system: "icd9cm", code: "96.59", name: "Irigasi luka lainnya", category: "Perawatan Luka" },
  { system: "icd9cm", code: "86.59", name: "Penjahitan luka kulit (hecting)", category: "Bedah Minor" },
  { system: "icd9cm", code: "86.28", name: "Debridement luka non-eksisi", category: "Perawatan Luka" },
  { system: "icd9cm", code: "86.04", name: "Insisi dan drainase abses kulit", category: "Bedah Minor" },
  { system: "icd9cm", code: "99.29", name: "Injeksi/infus zat terapeutik lainnya", category: "Injeksi & Infus" },
  { system: "icd9cm", code: "99.15", name: "Infus parenteral nutrisi/cairan", category: "Injeksi & Infus" },
  { system: "icd9cm", code: "99.59", name: "Imunisasi/vaksinasi lainnya", category: "Imunisasi" },
  { system: "icd9cm", code: "57.94", name: "Pemasangan kateter urin menetap", category: "Prosedur Kemih" },
  { system: "icd9cm", code: "96.07", name: "Pemasangan pipa nasogastrik (NGT)", category: "Prosedur Pencernaan" },
  { system: "icd9cm", code: "93.54", name: "Pemasangan bidai/gips imobilisasi", category: "Muskuloskeletal" },
  { system: "icd9cm", code: "23.09", name: "Pencabutan gigi lainnya", category: "Gigi & Mulut" },
  { system: "icd9cm", code: "75.99", name: "Pertolongan persalinan lainnya", category: "Kebidanan" },
]

export const defaultMedicalCodes: MedicalCode[] = [...icd10, ...icd9cm].map((seed) => ({
  id: `code-${seed.system}-${seed.code.replace(/\./g, "-").toLowerCase()}`,
  system: seed.system,
  code: seed.code,
  name: seed.name,
  category: seed.category,
  isActive: true,
  createdAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
}))
