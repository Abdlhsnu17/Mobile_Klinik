import 'package:flutter/material.dart';

import '../../models/user.dart';

/// Registri modul aplikasi — port dari `apps/frontend/lib/module-registry.ts`.
///
/// Sumber tunggal untuk navigasi, peluncur modul di dashboard, dan pengaturan
/// hak akses per peran. `href` sengaja dipertahankan sama dengan rute Next.js
/// agar konfigurasi hak akses yang tersimpan tetap kompatibel.
class ModuleItem {
  const ModuleItem({
    required this.title,
    required this.description,
    required this.href,
    required this.icon,
    required this.roles,
    required this.tone,
    this.shortTitle,
  });

  final String title;
  final String? shortTitle;
  final String description;
  final String href;
  final IconData icon;
  final List<UserRole> roles;
  final Color tone;

  String get navTitle => shortTitle ?? title;
}

class ModuleSection {
  const ModuleSection({
    required this.id,
    required this.label,
    required this.hint,
    required this.items,
  });

  final String id;
  final String label;
  final String hint;
  final List<ModuleItem> items;
}

const _admin = UserRole.admin;
const _dokter = UserRole.dokter;
const _perawat = UserRole.perawat;
const _bidan = UserRole.bidan;
const _teknis = UserRole.teknis;
const _umum = UserRole.umum;

const List<ModuleSection> moduleSections = [
  ModuleSection(
    id: 'menu-utama',
    label: 'Menu Utama',
    hint: 'Ringkasan dan alur pendaftaran kunjungan',
    items: [
      ModuleItem(
        title: 'Dashboard',
        description: 'Ringkasan aktivitas dan indikator utama klinik.',
        href: '/dashboard',
        icon: Icons.dashboard_outlined,
        roles: [_admin, _dokter, _perawat, _bidan, _teknis, _umum],
        tone: Color(0xFF00969F),
      ),
      ModuleItem(
        title: 'Pendaftaran',
        description:
            'Satu pintu untuk input pasien baru, pendaftaran kunjungan, dan antrian.',
        href: '/antrian',
        icon: Icons.event_note_outlined,
        roles: [_admin, _dokter, _perawat, _bidan, _umum],
        tone: Color(0xFF0EA5E9),
      ),
    ],
  ),
  ModuleSection(
    id: 'master-data',
    label: 'Master Data',
    hint: 'Data acuan pasien dan katalog layanan klinik',
    items: [
      ModuleItem(
        title: 'Rekam Medic',
        description:
            'Kelola data identitas dan kontak pasien untuk kebutuhan administrasi lanjutan.',
        href: '/pasien',
        icon: Icons.groups_outlined,
        roles: [_admin, _dokter, _perawat, _bidan],
        tone: Color(0xFF2563EB),
      ),
      ModuleItem(
        title: 'Layanan Klinis',
        shortTitle: 'Layanan',
        description: 'Kelola katalog layanan, durasi, dan tarif.',
        href: '/layanan-klinis',
        icon: Icons.assignment_outlined,
        roles: [_admin, _umum],
        tone: Color(0xFF059669),
      ),
      ModuleItem(
        title: 'Kode Diagnosa',
        shortTitle: 'Kode ICD',
        description:
            'Master kode ICD-10 (diagnosa) dan ICD-9-CM (tindakan) untuk standardisasi rekam medis.',
        href: '/kode-diagnosa',
        icon: Icons.sell_outlined,
        roles: [_admin],
        tone: Color(0xFFD97706),
      ),
    ],
  ),
  ModuleSection(
    id: 'layanan-medis',
    label: 'Layanan Medis',
    hint: 'Pemeriksaan, rawat inap, lab, dan data dokter',
    items: [
      ModuleItem(
        title: 'Pemeriksaan',
        description: 'Catat diagnosis, tindakan, resep, dan riwayat pasien.',
        href: '/pemeriksaan',
        icon: Icons.description_outlined,
        roles: [_admin, _dokter, _perawat, _bidan],
        tone: Color(0xFF0284C7),
      ),
      ModuleItem(
        title: 'Rawat Inap',
        description: 'Kelola kamar, bed, admisi, dan visit dokter.',
        href: '/rawat-inap',
        icon: Icons.bed_outlined,
        roles: [_admin, _perawat, _dokter],
        tone: Color(0xFF4F46E5),
      ),
      ModuleItem(
        title: 'Laboratorium',
        description: 'Input dan telusuri hasil pemeriksaan penunjang.',
        href: '/laboratorium',
        icon: Icons.science_outlined,
        roles: [_admin, _dokter, _perawat, _bidan, _teknis],
        tone: Color(0xFF7C3AED),
      ),
      ModuleItem(
        title: 'Radiologi',
        description: 'Kelola order radiologi, penjadwalan, dan hasil bacaan.',
        href: '/radiologi',
        icon: Icons.radar_outlined,
        roles: [_admin, _dokter, _perawat, _bidan, _teknis],
        tone: Color(0xFFE11D48),
      ),
      ModuleItem(
        title: 'Rujukan',
        description:
            'Kelola rujukan masuk/keluar, direktori fasilitas, dan surat rujukan.',
        href: '/rujukan',
        icon: Icons.share_outlined,
        roles: [_admin, _dokter, _perawat, _bidan, _umum],
        tone: Color(0xFF0891B2),
      ),
      ModuleItem(
        title: 'Persetujuan Tindakan',
        shortTitle: 'Consent',
        description:
            'Kelola informed consent pasien dan cetak surat persetujuan tindakan.',
        href: '/persetujuan-tindakan',
        icon: Icons.fact_check_outlined,
        roles: [_admin, _dokter, _perawat, _bidan, _umum],
        tone: Color(0xFF0D9488),
      ),
      ModuleItem(
        title: 'Dokter',
        description: 'Atur profil, spesialisasi, dan jadwal dokter.',
        href: '/dokter',
        icon: Icons.medical_services_outlined,
        roles: [_admin, _umum],
        tone: Color(0xFF16A34A),
      ),
    ],
  ),
  ModuleSection(
    id: 'farmasi',
    label: 'Farmasi',
    hint: 'E-Resep dan manajemen stok obat',
    items: [
      ModuleItem(
        title: 'Farmasi',
        description: 'Verifikasi e-resep dan proses penyerahan obat.',
        href: '/farmasi',
        icon: Icons.inventory_2_outlined,
        roles: [_admin, _teknis],
        tone: Color(0xFFEA580C),
      ),
      ModuleItem(
        title: 'Depo Farmasi',
        description: 'Pantau stok, kategori, dan ketersediaan obat.',
        href: '/depo-farmasi',
        icon: Icons.warehouse_outlined,
        roles: [_admin, _teknis],
        tone: Color(0xFFD97706),
      ),
      ModuleItem(
        title: 'Kartu Stok',
        description:
            'Telusuri mutasi stok obat dan catat koreksi atau stock opname.',
        href: '/kartu-stok',
        icon: Icons.playlist_add_check_outlined,
        roles: [_admin, _teknis],
        tone: Color(0xFF65A30D),
      ),
      ModuleItem(
        title: 'Pengadaan',
        description:
            'Kelola supplier, purchase order, dan penerimaan barang ke stok.',
        href: '/pengadaan',
        icon: Icons.local_shipping_outlined,
        roles: [_admin, _teknis],
        tone: Color(0xFF2563EB),
      ),
    ],
  ),
  ModuleSection(
    id: 'administrasi',
    label: 'Administrasi',
    hint: 'Pembayaran, asuransi, dan rekap laporan',
    items: [
      ModuleItem(
        title: 'Pembayaran',
        description: 'Catat pembayaran dan metode transaksi pasien.',
        href: '/pembayaran',
        icon: Icons.credit_card_outlined,
        roles: [_admin, _umum, _teknis],
        tone: Color(0xFF059669),
      ),
      ModuleItem(
        title: 'Kas',
        description: 'Catat pengeluaran operasional dan lakukan tutup kas harian.',
        href: '/kas',
        icon: Icons.account_balance_wallet_outlined,
        roles: [_admin, _umum],
        tone: Color(0xFFCA8A04),
      ),
      ModuleItem(
        title: 'Asuransi',
        description: 'Kelola profil penjamin dan verifikasi peserta.',
        href: '/asuransi',
        icon: Icons.verified_user_outlined,
        roles: [_admin, _umum],
        tone: Color(0xFF2563EB),
      ),
      ModuleItem(
        title: 'Laporan',
        description: 'Analisis kunjungan, pendapatan, dan performa layanan.',
        href: '/laporan',
        icon: Icons.bar_chart_outlined,
        roles: [_admin],
        tone: Color(0xFF9333EA),
      ),
    ],
  ),
  ModuleSection(
    id: 'manajemen-klinik',
    label: 'Manajemen Klinik',
    hint: 'Layanan, aset, komunikasi, dan dokumen',
    items: [
      ModuleItem(
        title: 'Peringatan',
        description:
            'Deteksi dini stok menipis, obat kedaluwarsa, dan jadwal maintenance alat.',
        href: '/peringatan',
        icon: Icons.notifications_active_outlined,
        roles: [_admin, _teknis, _perawat, _dokter, _bidan],
        tone: Color(0xFFDC2626),
      ),
      ModuleItem(
        title: 'Alat Medis',
        description: 'Kelola inventori, kondisi, dan jadwal pemeliharaan.',
        href: '/alat-medis',
        icon: Icons.build_outlined,
        roles: [_admin],
        tone: Color(0xFFEA580C),
      ),
      ModuleItem(
        title: 'Komunikasi',
        description: 'Kirim pengingat dan kelola survei kepuasan.',
        href: '/komunikasi',
        icon: Icons.chat_bubble_outline,
        roles: [_admin, _umum],
        tone: Color(0xFF0EA5E9),
      ),
      ModuleItem(
        title: 'Unggahan',
        description: 'Simpan dan unduh dokumen operasional klinik.',
        href: '/unggahan',
        icon: Icons.cloud_upload_outlined,
        roles: [_admin],
        tone: Color(0xFF4F46E5),
      ),
    ],
  ),
  ModuleSection(
    id: 'sistem',
    label: 'Sistem',
    hint: 'Pengguna dan konfigurasi aplikasi',
    items: [
      ModuleItem(
        title: 'Pengguna',
        description: 'Kelola akun, peran, dan akses pengguna.',
        href: '/pengguna',
        icon: Icons.manage_accounts_outlined,
        roles: [_admin],
        tone: Color(0xFF0D9488),
      ),
      ModuleItem(
        title: 'Riwayat Aktivitas',
        description: 'Telusuri riwayat perubahan data beserta pelakunya.',
        href: '/audit-log',
        icon: Icons.history_outlined,
        roles: [_admin],
        tone: Color(0xFFC026D3),
      ),
      ModuleItem(
        title: 'Pengaturan',
        description: 'Atur profil pengguna, tema, dan setelan sistem.',
        href: '/pengaturan',
        icon: Icons.settings_outlined,
        roles: [_admin, _dokter, _perawat, _bidan, _teknis, _umum],
        tone: Color(0xFF64748B),
      ),
    ],
  ),
];

/// Semua href modul, dipakai untuk validasi konfigurasi hak akses.
final List<String> allModuleHrefs = [
  for (final section in moduleSections)
    for (final item in section.items) item.href,
];

final Map<String, ModuleItem> moduleByHref = {
  for (final section in moduleSections)
    for (final item in section.items) item.href: item,
};

/// Bagian modul yang boleh diakses peran tertentu.
///
/// [allowedHrefs] berasal dari pengaturan hak akses; bila null, peran admin
/// mendapat semua modul dan peran lain difilter dari daftar `roles` bawaan.
List<ModuleSection> allowedModuleSections(
  UserRole? role, {
  Set<String>? allowedHrefs,
}) {
  if (role == null) return const [];

  return moduleSections
      .map((section) {
        final items = section.items.where((item) {
          if (allowedHrefs != null) return allowedHrefs.contains(item.href);
          if (role == UserRole.admin) return true;
          return item.roles.contains(role);
        }).toList();

        return ModuleSection(
          id: section.id,
          label: section.label,
          hint: section.hint,
          items: items,
        );
      })
      .where((section) => section.items.isNotEmpty)
      .toList();
}
