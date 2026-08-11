import type { User } from "@/lib/auth-types";
import type { LucideIcon } from "lucide-react";
import {
    BedDouble,
    BellRing,
    CalendarDays,
    ChartBar,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileText,
    FlaskConical,
    History,
    LayoutDashboard,
    MessageCircle,
    Package,
    Radiation,
    Settings,
    Share2,
    ShieldCheck,
    Stethoscope,
    Tags,
    Truck,
    UploadCloud,
    Wallet,
    UserCog,
    Users,
    Warehouse,
    Wrench,
} from "lucide-react";

export type UserRole = User["role"]

export type ModuleItem = {
  title: string
  shortTitle?: string
  description: string
  href: string
  icon: LucideIcon
  roles: UserRole[]
  toneClassName: string
}

export type ModuleSection = {
  id: string
  label: string
  hint: string
  items: ModuleItem[]
}

export const moduleSections: ModuleSection[] = [
  {
    id: "menu-utama",
    label: "Menu Utama",
    hint: "Ringkasan dan alur pendaftaran kunjungan",
    items: [
      {
        title: "Dashboard",
        description: "Ringkasan aktivitas dan indikator utama klinik.",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "dokter", "perawat", "bidan", "teknis", "umum"],
        toneClassName: "bg-primary/10 text-primary",
      },
      {
        title: "Pendaftaran",
        description: "Satu pintu untuk input pasien baru, pendaftaran kunjungan, dan antrian.",
        href: "/antrian",
        icon: CalendarDays,
        roles: ["admin", "dokter", "perawat", "bidan", "umum"],
        toneClassName: "bg-chart-4/15 text-chart-4",
      },
    ],
  },
  {
    id: "master-data",
    label: "Master Data",
    hint: "Data acuan pasien dan katalog layanan klinik",
    items: [
      {
        title: "Rekam Medic",
        description: "Kelola data identitas dan kontak pasien untuk kebutuhan administrasi lanjutan.",
        href: "/pasien",
        icon: Users,
        roles: ["admin", "dokter", "perawat", "bidan"],
        toneClassName: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
      },
      {
        title: "Layanan Klinis",
        shortTitle: "Layanan",
        description: "Kelola katalog layanan, durasi, dan tarif.",
        href: "/layanan-klinis",
        icon: ClipboardList,
        roles: ["admin", "umum"],
        toneClassName: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      },
      {
        title: "Kode Diagnosa",
        shortTitle: "Kode ICD",
        description: "Master kode ICD-10 (diagnosa) dan ICD-9-CM (tindakan) untuk standardisasi rekam medis.",
        href: "/kode-diagnosa",
        icon: Tags,
        roles: ["admin"],
        toneClassName: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
      },
    ],
  },
  {
    id: "layanan-medis",
    label: "Layanan Medis",
    hint: "Pemeriksaan, rawat inap, lab, dan data dokter",
    items: [
      {
        title: "Pemeriksaan",
        description: "Catat diagnosis, tindakan, resep, dan riwayat pasien.",
        href: "/pemeriksaan",
        icon: FileText,
        roles: ["admin", "dokter", "perawat", "bidan"],
        toneClassName: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
      },
      {
        title: "Rawat Inap",
        description: "Kelola kamar, bed, admisi, dan visit dokter.",
        href: "/rawat-inap",
        icon: BedDouble,
        roles: ["admin", "perawat", "dokter"],
        toneClassName: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
      },
      {
        title: "Laboratorium",
        description: "Input dan telusuri hasil pemeriksaan penunjang.",
        href: "/laboratorium",
        icon: FlaskConical,
        roles: ["admin", "dokter", "perawat", "bidan", "teknis"],
        toneClassName: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
      },
      {
        title: "Radiologi",
        description: "Kelola order radiologi, penjadwalan, dan hasil bacaan.",
        href: "/radiologi",
        icon: Radiation,
        roles: ["admin", "dokter", "perawat", "bidan", "teknis"],
        toneClassName: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
      },
      {
        title: "Rujukan",
        description: "Kelola rujukan masuk/keluar, direktori fasilitas, dan surat rujukan.",
        href: "/rujukan",
        icon: Share2,
        roles: ["admin", "dokter", "perawat", "bidan", "umum"],
        toneClassName: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-300",
      },
      {
        title: "Persetujuan Tindakan",
        shortTitle: "Consent",
        description: "Kelola informed consent pasien dan cetak surat persetujuan tindakan.",
        href: "/persetujuan-tindakan",
        icon: ClipboardCheck,
        roles: ["admin", "dokter", "perawat", "bidan", "umum"],
        toneClassName: "bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300",
      },
      {
        title: "Dokter",
        description: "Atur profil, spesialisasi, dan jadwal dokter.",
        href: "/dokter",
        icon: Stethoscope,
        roles: ["admin", "umum"],
        toneClassName: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300",
      },
    ],
  },
  {
    id: "farmasi",
    label: "Farmasi",
    hint: "E-Resep dan manajemen stok obat",
    items: [
      {
        title: "Farmasi",
        description: "Verifikasi e-resep dan proses penyerahan obat.",
        href: "/farmasi",
        icon: Package,
        roles: ["admin", "teknis"],
        toneClassName: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300",
      },
      {
        title: "Depo Farmasi",
        description: "Pantau stok, kategori, dan ketersediaan obat.",
        href: "/depo-farmasi",
        icon: Warehouse,
        roles: ["admin", "teknis"],
        toneClassName: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
      },
      {
        title: "Kartu Stok",
        description: "Telusuri mutasi stok obat dan catat koreksi atau stock opname.",
        href: "/kartu-stok",
        icon: ClipboardCheck,
        roles: ["admin", "teknis"],
        toneClassName: "bg-lime-100 text-lime-600 dark:bg-lime-950/50 dark:text-lime-300",
      },
      {
        title: "Pengadaan",
        description: "Kelola supplier, purchase order, dan penerimaan barang ke stok.",
        href: "/pengadaan",
        icon: Truck,
        roles: ["admin", "teknis"],
        toneClassName: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
      },
    ],
  },
  {
    id: "administrasi",
    label: "Administrasi",
    hint: "Pembayaran, asuransi, dan rekap laporan",
    items: [
      {
        title: "Pembayaran",
        description: "Catat pembayaran dan metode transaksi pasien.",
        href: "/pembayaran",
        icon: CreditCard,
        roles: ["admin", "umum", "teknis"],
        toneClassName: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      },
      {
        title: "Kas",
        description: "Catat pengeluaran operasional dan lakukan tutup kas harian.",
        href: "/kas",
        icon: Wallet,
        roles: ["admin", "umum"],
        toneClassName: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-300",
      },
      {
        title: "Asuransi",
        description: "Kelola profil penjamin dan verifikasi peserta.",
        href: "/asuransi",
        icon: ShieldCheck,
        roles: ["admin", "umum"],
        toneClassName: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
      },
      {
        title: "Laporan",
        description: "Analisis kunjungan, pendapatan, dan performa layanan.",
        href: "/laporan",
        icon: ChartBar,
        roles: ["admin"],
        toneClassName: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300",
      },
    ],
  },
  {
    id: "manajemen-klinik",
    label: "Manajemen Klinik",
    hint: "Layanan, aset, komunikasi, dan dokumen",
    items: [
      {
        title: "Peringatan",
        description: "Deteksi dini stok menipis, obat kedaluwarsa, dan jadwal maintenance alat.",
        href: "/peringatan",
        icon: BellRing,
        roles: ["admin", "teknis", "perawat", "dokter", "bidan"],
        toneClassName: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300",
      },
      {
        title: "Alat Medis",
        description: "Kelola inventori, kondisi, dan jadwal pemeliharaan.",
        href: "/alat-medis",
        icon: Wrench,
        roles: ["admin"],
        toneClassName: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300",
      },
      {
        title: "Komunikasi",
        description: "Kirim pengingat dan kelola survei kepuasan.",
        href: "/komunikasi",
        icon: MessageCircle,
        roles: ["admin", "umum"],
        toneClassName: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
      },
      {
        title: "Unggahan",
        description: "Simpan dan unduh dokumen operasional klinik.",
        href: "/unggahan",
        icon: UploadCloud,
        roles: ["admin"],
        toneClassName: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
      },
    ],
  },
  {
    id: "sistem",
    label: "Sistem",
    hint: "Pengguna dan konfigurasi aplikasi",
    items: [
      {
        title: "Pengguna",
        description: "Kelola akun, peran, dan akses pengguna.",
        href: "/pengguna",
        icon: UserCog,
        roles: ["admin"],
        toneClassName: "bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300",
      },
      {
        title: "Riwayat Aktivitas",
        shortTitle: "Riwayat Aktivitas",
        description: "Telusuri riwayat perubahan data beserta pelakunya.",
        href: "/audit-log",
        icon: History,
        roles: ["admin"],
        toneClassName: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/50 dark:text-fuchsia-300",
      },
      {
        title: "Pengaturan",
        description: "Atur profil pengguna, tema, dan setelan sistem.",
        href: "/pengaturan",
        icon: Settings,
        roles: ["admin", "dokter", "perawat", "bidan", "teknis", "umum"],
        toneClassName: "bg-slate-200 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
      },
    ],
  },
]

export function getAllowedModuleSections(role?: UserRole | null, allowedHrefs?: Set<string>) {
  if (!role) return []

  return moduleSections
    .map((section) => ({
      ...section,
      items: allowedHrefs
        ? section.items.filter((item) => allowedHrefs.has(item.href))
        : role === "admin"
        ? section.items
        : section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0)
}
