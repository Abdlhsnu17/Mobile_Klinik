import 'dart:convert';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Penyimpanan sesi pengguna di perangkat.
///
/// Backend mengeluarkan sesi sebagai cookie httpOnly dan sengaja tidak
/// mengembalikan token JWT di badan respons, agar token tidak dapat dibaca
/// skrip di sisi web. Aplikasi ini mengikuti model yang sama: cookie disimpan
/// oleh [PersistCookieJar] dan dikirim ulang otomatis oleh Dio, sehingga tidak
/// ada token yang perlu ditangani manual.
///
/// Profil pengguna dan preferensi ringan disimpan di SharedPreferences.
class SessionStore {
  SessionStore();

  static const _userKey = 'clinic_current_user';
  static const _rememberedUsernameKey = 'remembered_username';
  static const _roleAccessKey = 'clinic_role_access_settings_v2';
  static const _themeModeKey = 'clinic_theme_mode';

  PersistCookieJar? _cookieJar;

  /// Wadah cookie yang bertahan antar sesi aplikasi.
  ///
  /// Dibuat sekali lalu dipakai ulang; disimpan di direktori dokumen aplikasi
  /// yang bersifat privat untuk tiap aplikasi di Android maupun iOS.
  Future<PersistCookieJar> cookieJar() async {
    final existing = _cookieJar;
    if (existing != null) return existing;

    final directory = await getApplicationDocumentsDirectory();
    final jar = PersistCookieJar(
      ignoreExpires: false,
      storage: FileStorage('${directory.path}/.clinic_cookies'),
    );

    _cookieJar = jar;
    return jar;
  }

  Future<Map<String, dynamic>?> readUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null || raw.isEmpty) return null;

    try {
      final decoded = jsonDecode(raw);
      return decoded is Map<String, dynamic> ? decoded : null;
    } on FormatException {
      // Data rusak tidak boleh membuat aplikasi gagal start.
      await prefs.remove(_userKey);
      return null;
    }
  }

  Future<void> writeUser(Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user));
  }

  /// Menandai bahwa perangkat pernah memiliki sesi.
  ///
  /// Dipakai untuk memutuskan apakah perlu memanggil `/auth/me` saat start-up;
  /// isi cookie sendiri tidak dapat dibaca dari kode aplikasi.
  Future<bool> hasStoredSession() async => (await readUser()) != null;

  /// Mengakhiri sesi: hapus profil lokal sekaligus cookie autentikasi.
  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await (await cookieJar()).deleteAll();
  }

  Future<String?> readRememberedUsername() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_rememberedUsernameKey);
  }

  Future<void> writeRememberedUsername(String? username) async {
    final prefs = await SharedPreferences.getInstance();
    if (username == null || username.isEmpty) {
      await prefs.remove(_rememberedUsernameKey);
      return;
    }
    await prefs.setString(_rememberedUsernameKey, username);
  }

  Future<Map<String, List<String>>> readRoleAccess() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_roleAccessKey);
    if (raw == null || raw.isEmpty) return const {};

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const {};
      return decoded.map(
        (key, value) => MapEntry(
          key as String,
          (value as List).map((entry) => entry as String).toList(),
        ),
      );
    } on FormatException {
      await prefs.remove(_roleAccessKey);
      return const {};
    }
  }

  Future<void> writeRoleAccess(Map<String, List<String>> settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_roleAccessKey, jsonEncode(settings));
  }

  Future<String?> readThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_themeModeKey);
  }

  Future<void> writeThemeMode(String mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeModeKey, mode);
  }
}
