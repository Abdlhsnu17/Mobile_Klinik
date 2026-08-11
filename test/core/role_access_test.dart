import 'package:flutter_application_mobile_apps_klinik/src/core/access/module_registry.dart';
import 'package:flutter_application_mobile_apps_klinik/src/core/access/role_access.dart';
import 'package:flutter_application_mobile_apps_klinik/src/models/user.dart';
import 'package:flutter_test/flutter_test.dart';

/// Padanan `apps/frontend/lib/role-access.test.ts`.
void main() {
  group('RoleAccess.canAccessPath', () {
    final defaults = RoleAccess.defaultSettings();

    test('mengizinkan rute publik tanpa peran', () {
      for (final path in RoleAccess.publicPaths) {
        expect(RoleAccess.canAccessPath(null, path, defaults), isTrue);
      }
    });

    test('menolak rute modul ketika tidak ada sesi', () {
      expect(RoleAccess.canAccessPath(null, '/dashboard', defaults), isFalse);
    });

    test('mengizinkan modul yang ada di konfigurasi peran', () {
      expect(
        RoleAccess.canAccessPath(UserRole.dokter, '/pemeriksaan', defaults),
        isTrue,
      );
    });

    test('menolak modul yang dicabut dari peran', () {
      final settings = {
        ...defaults,
        UserRole.perawat: ['/dashboard'],
      };

      expect(
        RoleAccess.canAccessPath(UserRole.perawat, '/laporan', settings),
        isFalse,
      );
      expect(
        RoleAccess.canAccessPath(UserRole.perawat, '/dashboard', settings),
        isTrue,
      );
    });

    test('sub-rute mewarisi izin modul induknya', () {
      final settings = {
        ...defaults,
        UserRole.umum: ['/pasien'],
      };

      expect(
        RoleAccess.canAccessPath(UserRole.umum, '/pasien/123', settings),
        isTrue,
      );
      expect(
        RoleAccess.canAccessPath(UserRole.umum, '/laporan/detail', settings),
        isFalse,
      );
    });

    test('admin tetap memegang akses penuh meski konfigurasi dipersempit', () {
      final settings = {
        ...defaults,
        UserRole.admin: <String>[],
      };

      expect(
        RoleAccess.canAccessPath(UserRole.admin, '/laporan', settings),
        isTrue,
      );
    });
  });

  group('RoleAccess.landingPath', () {
    test('mengarahkan ke login tanpa peran', () {
      expect(
        RoleAccess.landingPath(null, RoleAccess.defaultSettings()),
        '/login',
      );
    });

    test('memilih dashboard bila diizinkan', () {
      expect(
        RoleAccess.landingPath(UserRole.dokter, RoleAccess.defaultSettings()),
        '/dashboard',
      );
    });

    test('jatuh ke modul pertama yang diizinkan bila dashboard dicabut', () {
      final settings = {
        ...RoleAccess.defaultSettings(),
        UserRole.teknis: ['/farmasi'],
      };

      expect(RoleAccess.landingPath(UserRole.teknis, settings), '/farmasi');
    });

    test('jatuh ke pengaturan bila tidak ada modul yang diizinkan', () {
      final settings = {
        ...RoleAccess.defaultSettings(),
        UserRole.umum: <String>[],
      };

      expect(RoleAccess.landingPath(UserRole.umum, settings), '/pengaturan');
    });
  });

  group('RoleAccess.normalize', () {
    test('membuang href yang tidak lagi terdaftar sebagai modul', () {
      final settings = {
        ...RoleAccess.defaultSettings(),
        UserRole.bidan: ['/pasien', '/modul-yang-sudah-dihapus'],
      };

      final normalized = RoleAccess.normalize(settings);

      expect(normalized[UserRole.bidan], ['/pasien']);
    });

    test('mengembalikan akses penuh untuk admin apa pun masukannya', () {
      final normalized = RoleAccess.normalize({UserRole.admin: const []});

      expect(normalized[UserRole.admin], hasLength(allModuleHrefs.length));
    });
  });

  group('RoleAccess.canReadCollection', () {
    test('admin boleh membaca koleksi apa pun', () {
      expect(RoleAccess.canReadCollection(UserRole.admin, 'audit-logs'), isTrue);
    });

    test('peran non-admin dibatasi daftar koleksi terbaca', () {
      expect(RoleAccess.canReadCollection(UserRole.umum, 'audit-logs'), isFalse);
      expect(RoleAccess.canReadCollection(UserRole.umum, 'patients'), isTrue);
    });

    test('tanpa peran selalu ditolak', () {
      expect(RoleAccess.canReadCollection(null, 'patients'), isFalse);
    });
  });

  group('fromStorage', () {
    test('memakai bawaan ketika penyimpanan kosong', () {
      final settings = RoleAccess.fromStorage(const {});

      expect(settings[UserRole.admin], hasLength(allModuleHrefs.length));
    });

    test('mengabaikan nama peran yang tidak dikenal', () {
      final settings = RoleAccess.fromStorage({
        'dokter': ['/pemeriksaan'],
        'peran-tidak-dikenal': ['/laporan'],
      });

      expect(settings[UserRole.dokter], ['/pemeriksaan']);
      expect(settings.containsKey(UserRole.admin), isTrue);
    });

    test('bolak-balik lewat toStorage mempertahankan konfigurasi', () {
      final original = {
        ...RoleAccess.defaultSettings(),
        UserRole.teknis: ['/farmasi', '/depo-farmasi'],
      };

      final restored =
          RoleAccess.fromStorage(RoleAccess.toStorage(original));

      expect(restored[UserRole.teknis], ['/farmasi', '/depo-farmasi']);
    });
  });
}
