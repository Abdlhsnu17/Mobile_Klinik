import 'package:go_router/go_router.dart';

import '../alerts/alerts_screen.dart';
import '../cashier/cashier_screen.dart';
import '../documents/documents_screen.dart';
import '../medical_records/medical_records_screen.dart';
import '../pharmacy/pharmacy_screen.dart';
import '../queue/queue_screen.dart';
import '../reports/reports_screen.dart';
import '../settings/settings_screen.dart';
import 'collection_config.dart';
import 'collection_screen.dart';
import 'module_configs.dart';
import 'tabbed_module_screen.dart';

/// Pemetaan rute modul ke layarnya.
///
/// Path mengikuti rute Next.js supaya registri modul dan konfigurasi hak akses
/// tidak perlu diubah. Modul yang murni CRUD memakai [CollectionScreen] dengan
/// konfigurasi dari `module_configs.dart`; modul dengan alur kerja khusus
/// punya layar tersendiri.
final List<RouteBase> moduleRoutes = [
  // ── Alur kerja khusus ──────────────────────────────────────────────────
  GoRoute(path: '/antrian', builder: (context, state) => const QueueScreen()),
  GoRoute(
    path: '/pemeriksaan',
    builder: (context, state) => const MedicalRecordsScreen(),
  ),
  GoRoute(
    path: '/farmasi',
    builder: (context, state) => const PharmacyScreen(),
  ),
  GoRoute(
    path: '/peringatan',
    builder: (context, state) => const AlertsScreen(),
  ),
  GoRoute(path: '/laporan', builder: (context, state) => const ReportsScreen()),
  GoRoute(path: '/kas', builder: (context, state) => const CashierScreen()),
  GoRoute(
    path: '/unggahan',
    builder: (context, state) => const DocumentsScreen(),
  ),
  GoRoute(
    path: '/pengaturan',
    builder: (context, state) => const SettingsScreen(),
  ),

  // ── Modul CRUD berbasis satu koleksi ───────────────────────────────────
  _collectionRoute('/pasien', patientsConfig),
  _collectionRoute('/dokter', doctorsConfig),
  _collectionRoute('/layanan-klinis', servicesConfig),
  _collectionRoute('/kode-diagnosa', medicalCodesConfig),
  _collectionRoute('/depo-farmasi', medicinesConfig),
  _collectionRoute('/kartu-stok', stockMovementsConfig),
  _collectionRoute('/alat-medis', medicalEquipmentsConfig),
  _collectionRoute('/radiologi', radiologyOrdersConfig),
  _collectionRoute('/pembayaran', paymentsConfig),
  _collectionRoute('/persetujuan-tindakan', informedConsentsConfig),
  _collectionRoute('/pengguna', usersConfig),
  _collectionRoute('/audit-log', auditLogsConfig),

  // ── Modul yang menggabungkan beberapa koleksi terkait ──────────────────
  GoRoute(
    path: '/laboratorium',
    builder: (context, state) => TabbedModuleScreen(
      configs: [labOrdersConfig, labResultsConfig],
      tabLabels: const ['Order', 'Hasil'],
    ),
  ),
  GoRoute(
    path: '/rawat-inap',
    builder: (context, state) => TabbedModuleScreen(
      configs: [inpatientAdmissionsConfig, bedsConfig, doctorVisitNotesConfig],
      tabLabels: const ['Admisi', 'Bed', 'Visit'],
    ),
  ),
  GoRoute(
    path: '/rujukan',
    builder: (context, state) => TabbedModuleScreen(
      configs: [referralsConfig, referralFacilitiesConfig],
      tabLabels: const ['Rujukan', 'Fasilitas'],
    ),
  ),
  GoRoute(
    path: '/pengadaan',
    builder: (context, state) => TabbedModuleScreen(
      configs: [purchaseOrdersConfig, suppliersConfig],
      tabLabels: const ['Purchase Order', 'Supplier'],
    ),
  ),
  GoRoute(
    path: '/asuransi',
    builder: (context, state) => TabbedModuleScreen(
      configs: [
        insuranceProfilesConfig,
        insuranceBridgeMembersConfig,
        billingRecordsConfig,
      ],
      tabLabels: const ['Profil', 'Bridging', 'Tagihan'],
    ),
  ),
  GoRoute(
    path: '/komunikasi',
    builder: (context, state) => TabbedModuleScreen(
      configs: [patientNotificationsConfig, satisfactionSurveysConfig],
      tabLabels: const ['Pengingat', 'Survei'],
    ),
  ),
];

GoRoute _collectionRoute(String path, CollectionConfig config) => GoRoute(
      path: path,
      builder: (context, state) => CollectionScreen(config: config),
    );
