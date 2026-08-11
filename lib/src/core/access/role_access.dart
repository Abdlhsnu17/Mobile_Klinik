import '../../models/user.dart';
import 'module_registry.dart';

/// Aturan hak akses per peran — port dari `apps/frontend/lib/role-access.ts`.
///
/// Konfigurasi tersimpan lokal (per perangkat) dan hanya membatasi navigasi di
/// sisi klien. Otorisasi sebenarnya tetap ditegakkan backend lewat
/// `requireRole`, jadi ini murni lapisan pengalaman pengguna.
class RoleAccess {
  const RoleAccess._();

  /// Peran yang dapat dikonfigurasi di layar pengaturan hak akses.
  static const List<UserRole> managedRoleOrder = [
    UserRole.admin,
    UserRole.dokter,
    UserRole.perawat,
    UserRole.bidan,
    UserRole.teknis,
    UserRole.umum,
  ];

  /// Rute yang boleh diakses tanpa sesi.
  static const Set<String> publicPaths = {
    '/',
    '/login',
    '/daftar',
    '/lupa-password',
  };

  /// Peran yang boleh membaca tiap koleksi, dipakai untuk menyembunyikan menu
  /// yang pasti ditolak backend. Cerminan `READABLE_COLLECTION_ROLES`.
  static const Map<String, List<UserRole>> readableCollectionRoles = {
    'patients': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.teknis,
      UserRole.umum,
    ],
    'users': [UserRole.admin],
    'doctors': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.teknis,
      UserRole.umum,
    ],
    'services': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.teknis,
      UserRole.umum,
    ],
    'appointments': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.umum,
    ],
    'medical-records': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.teknis,
      UserRole.umum,
    ],
    'medicines': [
      UserRole.admin,
      UserRole.teknis,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.umum,
    ],
    'medical-equipments': [
      UserRole.admin,
      UserRole.perawat,
      UserRole.dokter,
      UserRole.bidan,
    ],
    'lab-orders': [
      UserRole.admin,
      UserRole.teknis,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
    ],
    'lab-results': [
      UserRole.admin,
      UserRole.teknis,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
    ],
    'radiology-orders': [
      UserRole.admin,
      UserRole.teknis,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
    ],
    'payments': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.teknis,
      UserRole.umum,
    ],
    'billing-records': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.teknis,
      UserRole.umum,
    ],
    'documents': [UserRole.admin, UserRole.umum],
    'pharmacy-requests': [
      UserRole.admin,
      UserRole.teknis,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.umum,
    ],
    'insurance-profiles': [
      UserRole.admin,
      UserRole.umum,
      UserRole.dokter,
      UserRole.bidan,
    ],
    'insurance-bridge-members': [UserRole.admin, UserRole.umum],
    'beds': [UserRole.admin, UserRole.perawat, UserRole.dokter, UserRole.bidan],
    'inpatient-admissions': [
      UserRole.admin,
      UserRole.perawat,
      UserRole.dokter,
      UserRole.bidan,
    ],
    'doctor-visit-notes': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
    ],
    'patient-notifications': [UserRole.admin, UserRole.umum],
    'satisfaction-surveys': [UserRole.admin, UserRole.umum],
    'audit-logs': [UserRole.admin],
    'referrals': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.umum,
    ],
    'referral-facilities': [
      UserRole.admin,
      UserRole.dokter,
      UserRole.bidan,
      UserRole.perawat,
      UserRole.umum,
    ],
  };

  /// Konfigurasi bawaan: setiap peran terkelola mendapat seluruh modul, lalu
  /// dapat dipersempit administrator lewat layar pengaturan.
  static Map<UserRole, List<String>> defaultSettings() => {
        for (final role in managedRoleOrder) role: List.of(allModuleHrefs),
      };

  /// Membersihkan konfigurasi tersimpan: membuang href yang sudah tidak ada
  /// dan memastikan admin selalu memegang akses penuh.
  static Map<UserRole, List<String>> normalize(
    Map<UserRole, List<String>> settings,
  ) {
    final defaults = defaultSettings();
    final validHrefs = allModuleHrefs.toSet();

    return {
      for (final role in managedRoleOrder)
        role: role == UserRole.admin
            ? defaults[role]!
            : (settings[role] ?? defaults[role]!)
                .toSet()
                .where(validHrefs.contains)
                .toList(),
    };
  }

  /// Mengubah bentuk tersimpan (kunci string) menjadi peta ber-enum.
  static Map<UserRole, List<String>> fromStorage(
    Map<String, List<String>> raw,
  ) {
    if (raw.isEmpty) return defaultSettings();

    final parsed = <UserRole, List<String>>{};
    raw.forEach((key, value) {
      final role = UserRole.tryParse(key);
      if (role != null) parsed[role] = value;
    });

    return normalize(parsed);
  }

  static Map<String, List<String>> toStorage(
    Map<UserRole, List<String>> settings,
  ) =>
      settings.map((role, hrefs) => MapEntry(role.value, hrefs));

  static Set<String> allowedModuleHrefs(
    UserRole? role,
    Map<UserRole, List<String>> settings,
  ) {
    if (role == null) return const {};
    return normalize(settings)[role]?.toSet() ?? const {};
  }

  /// Apakah peran boleh membuka sebuah rute.
  ///
  /// Rute yang tidak terdaftar sebagai modul (mis. sub-halaman detail)
  /// dicocokkan ke modul induk terpanjang yang menjadi prefiksnya.
  static bool canAccessPath(
    UserRole? role,
    String path,
    Map<UserRole, List<String>> settings,
  ) {
    if (publicPaths.contains(path)) return true;
    if (role == null) return false;

    final matched = allModuleHrefs
        .where((href) => path == href || path.startsWith('$href/'))
        .fold<String?>(
          null,
          (longest, href) =>
              longest == null || href.length > longest.length ? href : longest,
        );

    if (matched == null) return true;
    return allowedModuleHrefs(role, settings).contains(matched);
  }

  /// Rute tujuan setelah login: dashboard bila diizinkan, selain itu modul
  /// pertama yang boleh diakses.
  static String landingPath(
    UserRole? role,
    Map<UserRole, List<String>> settings,
  ) {
    if (role == null) return '/login';

    final allowed = allowedModuleHrefs(role, settings);
    if (allowed.contains('/dashboard')) return '/dashboard';

    return allModuleHrefs.firstWhere(
      allowed.contains,
      orElse: () => '/pengaturan',
    );
  }

  static bool canReadCollection(UserRole? role, String collection) {
    if (role == null) return false;
    if (role == UserRole.admin) return true;

    final base = collection.startsWith('documents?category=')
        ? 'documents'
        : collection;
    return readableCollectionRoles[base]?.contains(role) ?? false;
  }
}
