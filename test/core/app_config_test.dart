import 'package:flutter_application_mobile_apps_klinik/src/core/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

/// Padanan `apps/frontend/lib/api-base.test.ts`.
void main() {
  group('AppConfig.apiBaseUrl', () {
    test('selalu berakhiran /api', () {
      expect(AppConfig.apiBaseUrl.endsWith('/api'), isTrue);
    });

    test('tidak menggandakan suffix /api', () {
      expect(RegExp(r'/api/api').hasMatch(AppConfig.apiBaseUrl), isFalse);
    });
  });

  group('AppConfig.backendOrigin', () {
    test('tidak menyertakan prefix /api agar aset statis dapat dimuat', () {
      expect(AppConfig.backendOrigin.endsWith('/api'), isFalse);
    });
  });

  group('AppConfig.resolveMediaUrl', () {
    test('mengembalikan null untuk nilai kosong', () {
      expect(AppConfig.resolveMediaUrl(null), isNull);
      expect(AppConfig.resolveMediaUrl(''), isNull);
      expect(AppConfig.resolveMediaUrl('   '), isNull);
    });

    test('membiarkan URL absolut apa adanya', () {
      expect(
        AppConfig.resolveMediaUrl('https://cdn.contoh.id/foto.png'),
        'https://cdn.contoh.id/foto.png',
      );
      expect(
        AppConfig.resolveMediaUrl('data:image/png;base64,AAAA'),
        'data:image/png;base64,AAAA',
      );
    });

    test('mengubah path relatif menjadi URL absolut ke origin backend', () {
      final resolved = AppConfig.resolveMediaUrl('/uploads/avatars/a.png');

      expect(resolved, '${AppConfig.backendOrigin}/uploads/avatars/a.png');
    });

    test('menambahkan garis miring untuk path tanpa awalan', () {
      final resolved = AppConfig.resolveMediaUrl('uploads/a.png');

      expect(resolved, '${AppConfig.backendOrigin}/uploads/a.png');
    });
  });
}
