import 'package:flutter/foundation.dart';

/// Konfigurasi runtime aplikasi.
///
/// Base URL API dapat di-override saat build tanpa mengubah kode:
///
/// ```sh
/// flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4004
/// ```
class AppConfig {
  const AppConfig._();

  static const String appName = 'AbdiCareKlinik';
  static const String appTagline = 'Sistem Informasi Klinik';
  static const String brandCopyright = '© 2026. Hak cipta dilindungi.';

  static const String _rawApiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');

  static const int _defaultBackendPort = 4004;

  /// Origin backend tanpa suffix `/api`, mis. `http://10.0.2.2:4004`.
  ///
  /// Aset statis (`/uploads/...`) disajikan di luar prefix `/api`, sehingga
  /// suffix tersebut dibuang bila ikut tertulis di `API_BASE_URL`.
  static String get backendOrigin {
    if (_rawApiBaseUrl.isEmpty) {
      return 'http://${_defaultDevHost()}:$_defaultBackendPort';
    }

    final base = _stripTrailingSlash(_rawApiBaseUrl);
    return base.endsWith('/api') ? base.substring(0, base.length - 4) : base;
  }

  /// Base URL lengkap yang dipakai [ApiClient], selalu berakhiran `/api`.
  static String get apiBaseUrl {
    final origin = backendOrigin;
    return origin.endsWith('/api') ? origin : '$origin/api';
  }

  /// Emulator Android memetakan localhost host-machine ke 10.0.2.2, sedangkan
  /// simulator iOS/desktop dapat memakai localhost apa adanya.
  static String _defaultDevHost() {
    if (kIsWeb) return 'localhost';
    if (defaultTargetPlatform == TargetPlatform.android) return '10.0.2.2';
    return 'localhost';
  }

  static String _stripTrailingSlash(String value) =>
      value.endsWith('/') ? value.substring(0, value.length - 1) : value;

  /// Mengubah path aset backend (mis. `/uploads/avatars/x.png`) menjadi URL
  /// absolut yang bisa dimuat oleh [Image.network].
  ///
  /// Padanan `resolveMediaUrl` di frontend Next.js.
  static String? resolveMediaUrl(String? pathOrUrl) {
    final value = pathOrUrl?.trim();
    if (value == null || value.isEmpty) return null;
    if (value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('//') ||
        value.startsWith('data:')) {
      return value;
    }

    final normalized = value.startsWith('/') ? value : '/$value';
    return '$backendOrigin$normalized';
  }
}
