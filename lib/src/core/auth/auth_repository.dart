import 'package:dio/dio.dart';

import '../api/api_client.dart';
import '../../models/user.dart';
import 'session_store.dart';

/// Akses endpoint `/auth` dan `/users` — port dari `lib/auth-utils.ts`.
class AuthRepository {
  const AuthRepository({
    required ApiClient apiClient,
    required SessionStore sessionStore,
  })  : _api = apiClient,
        _sessionStore = sessionStore;

  final ApiClient _api;
  final SessionStore _sessionStore;

  /// Login lalu simpan token + profil ke perangkat.
  Future<AppUser> login(String username, String password) async {
    final payload = await _api.post<Map<String, dynamic>>(
      '/auth/login',
      body: {'username': username.trim(), 'password': password},
    );

    return _persistSession(payload);
  }

  Future<AppUser> register({
    required String username,
    required String password,
    required String name,
    required String email,
  }) async {
    final payload = await _api.post<Map<String, dynamic>>(
      '/auth/register',
      body: {
        'username': username.trim(),
        'password': password,
        'name': name.trim(),
        'email': email.trim(),
      },
    );

    return _persistSession(payload);
  }

  /// Memulihkan sesi saat aplikasi dibuka.
  ///
  /// Cookie autentikasi tidak dapat dibaca dari kode aplikasi, jadi keabsahan
  /// sesi diverifikasi ke `/auth/me`. Bila cookie sudah kedaluwarsa backend
  /// membalas 401 dan sesi dibersihkan oleh pemanggil.
  Future<AppUser?> restoreSession() async {
    if (!await _sessionStore.hasStoredSession()) return null;

    final payload = await _api.get<Map<String, dynamic>>('/auth/me');
    final user = AppUser.fromJson(_userJson(payload));
    await _sessionStore.writeUser(user.toJson());
    return user;
  }

  /// Profil yang tersimpan di perangkat, tanpa memanggil jaringan.
  Future<AppUser?> cachedUser() async {
    final json = await _sessionStore.readUser();
    return json == null ? null : AppUser.fromJson(json);
  }

  Future<void> logout() async {
    try {
      await _api.post<void>('/auth/logout');
    } catch (_) {
      // Logout lokal harus tetap berhasil walau server tidak terjangkau.
    }
    await _sessionStore.clearSession();
  }

  Future<String?> requestPasswordReset(String email) async {
    final payload = await _api.post<Map<String, dynamic>>(
      '/auth/request-password-reset',
      body: {'email': email.trim()},
    );

    // Di luar production backend mengembalikan `devToken` untuk mempermudah
    // pengujian tanpa layanan email.
    final devToken = payload['devToken'];
    return devToken is String ? devToken : null;
  }

  Future<void> resetPassword(String token, String password) async {
    await _api.post<Map<String, dynamic>>(
      '/auth/reset-password',
      body: {'token': token.trim(), 'password': password},
    );
  }

  /// Mengubah password. Backend menghapus sesi setelahnya sehingga pengguna
  /// harus login ulang.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.post<Map<String, dynamic>>(
      '/auth/change-password',
      body: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }

  Future<AppUser> updateProfile(
    String id, {
    required String name,
    required String email,
  }) async {
    final payload = await _api.put<Map<String, dynamic>>(
      '/users/$id',
      body: {'name': name.trim(), 'email': email.trim()},
    );

    final user = AppUser.fromJson(_userJson(payload));
    await _sessionStore.writeUser(user.toJson());
    return user;
  }

  Future<AppUser> uploadAvatar(String filePath) async {
    final formData = FormData.fromMap({
      'avatar': await MultipartFile.fromFile(filePath),
    });

    final payload =
        await _api.upload<Map<String, dynamic>>('/users/avatar', formData);
    final user = AppUser.fromJson(_userJson(payload));
    await _sessionStore.writeUser(user.toJson());
    return user;
  }

  /// Menyimpan profil hasil login/registrasi.
  ///
  /// Cookie sesi sudah dipersistensi oleh interceptor pada klien HTTP, jadi
  /// di sini hanya profil pengguna yang perlu disimpan.
  Future<AppUser> _persistSession(Map<String, dynamic> payload) async {
    final user = AppUser.fromJson(_userJson(payload));
    await _sessionStore.writeUser(user.toJson());
    return user;
  }

  /// Endpoint auth membungkus profil sebagai `{ user: {...} }`, sedangkan
  /// endpoint `/users/:id` mengembalikan objek pengguna langsung.
  static Map<String, dynamic> _userJson(Map<String, dynamic> payload) {
    final nested = payload['user'];
    if (nested is Map<String, dynamic>) return nested;
    if (nested is Map) return nested.map((k, v) => MapEntry(k.toString(), v));
    return payload;
  }
}
