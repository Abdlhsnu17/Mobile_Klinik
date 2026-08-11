import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

import '../auth/session_store.dart';
import '../config/app_config.dart';
import 'api_exception.dart';

/// Klien HTTP tunggal untuk seluruh aplikasi.
///
/// Padanan `lib/api-client.ts` di frontend Next.js: mengirim kredensial sesi,
/// membuka amplop respons `{ data, meta, requestId }`, dan menormalkan error
/// menjadi [ApiException].
///
/// Autentikasi memakai cookie httpOnly yang sama dengan aplikasi web —
/// backend sengaja tidak mengembalikan token JWT di badan respons. Cookie
/// disimpan [PersistCookieJar] dan dilampirkan otomatis oleh interceptor,
/// sehingga tidak ada token yang perlu dikelola manual di sini.
class ApiClient {
  ApiClient({required SessionStore sessionStore, Dio? dio})
      : _dio = dio ?? Dio(),
        _sessionStore = sessionStore {
    _dio.options
      ..baseUrl = AppConfig.apiBaseUrl
      ..connectTimeout = const Duration(seconds: 20)
      ..receiveTimeout = const Duration(seconds: 30)
      ..headers['Accept'] = 'application/json'
      // Status non-2xx ditangani manual agar pesan backend bisa dibaca.
      ..validateStatus = (_) => true;
  }

  final Dio _dio;
  final SessionStore _sessionStore;

  /// Memastikan interceptor cookie terpasang sebelum permintaan pertama.
  ///
  /// Pemasangannya asinkron karena wadah cookie perlu membaca direktori
  /// dokumen aplikasi lebih dulu.
  Future<void>? _cookieSetup;

  Future<void> _ensureCookieManager() {
    return _cookieSetup ??= () async {
      final jar = await _sessionStore.cookieJar();
      _dio.interceptors.add(CookieManager(jar));
    }();
  }

  /// Dipanggil saat server menolak sesi (401) supaya lapisan atas dapat
  /// mengakhiri sesi dan mengarahkan pengguna ke halaman login.
  void Function()? onUnauthorized;

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) =>
      _request<T>('GET', path, query: query);

  Future<T> post<T>(String path, {Object? body}) =>
      _request<T>('POST', path, body: body);

  Future<T> put<T>(String path, {Object? body}) =>
      _request<T>('PUT', path, body: body);

  Future<T> patch<T>(String path, {Object? body}) =>
      _request<T>('PATCH', path, body: body);

  Future<T> delete<T>(String path, {Object? body}) =>
      _request<T>('DELETE', path, body: body);

  /// Mengunggah berkas multipart (avatar pengguna, dokumen klinik).
  Future<T> upload<T>(String path, FormData formData) =>
      _request<T>('POST', path, body: formData);

  /// Mengunduh berkas biner (PDF surat rujukan, informed consent, laporan).
  Future<List<int>> download(String path, {Map<String, dynamic>? query}) async {
    await _ensureCookieManager();

    late Response<List<int>> response;
    try {
      response = await _dio.get<List<int>>(
        path,
        queryParameters: query,
        options: Options(responseType: ResponseType.bytes),
      );
    } on DioException catch (error) {
      throw _networkException(error, 'GET', path);
    }

    final status = response.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      _handleUnauthorized(status);
      throw ApiException(
        friendlyApiErrorMessage(status: status),
        statusCode: status,
        method: 'GET',
        path: path,
      );
    }

    return response.data ?? const [];
  }

  Future<T> _request<T>(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) async {
    await _ensureCookieManager();

    late Response<dynamic> response;
    try {
      response = await _dio.request<dynamic>(
        path,
        data: body,
        queryParameters: query,
        options: Options(method: method),
      );
    } on DioException catch (error) {
      throw _networkException(error, method, path);
    }

    final status = response.statusCode ?? 0;
    final payload = response.data;

    if (status < 200 || status >= 300) {
      _handleUnauthorized(status);
      throw ApiException(
        friendlyApiErrorMessage(
          status: status,
          payloadMessage: _payloadMessage(payload),
        ),
        statusCode: status,
        method: method,
        path: path,
        requestId: _requestId(payload),
      );
    }

    // 204 No Content — tidak ada badan respons untuk dibaca.
    if (status == 204 || payload == null) return null as T;

    return _unwrapEnvelope(payload) as T;
  }

  void _handleUnauthorized(int status) {
    if (status == 401) onUnauthorized?.call();
  }

  ApiException _networkException(
    DioException error,
    String method,
    String path,
  ) {
    final message = switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'Server tidak merespons tepat waktu. Coba lagi beberapa saat.',
      DioExceptionType.cancel => 'Permintaan dibatalkan.',
      _ =>
        'Tidak dapat terhubung ke server backend. Periksa koneksi Anda lalu coba lagi.',
    };

    return ApiException(message, method: method, path: path);
  }

  /// Backend membungkus respons sukses sebagai `{ data, meta, requestId }`.
  /// Beberapa endpoint lama mengembalikan payload polos, jadi amplop hanya
  /// dibuka ketika kunci `data` benar-benar ada.
  static dynamic _unwrapEnvelope(dynamic payload) {
    if (payload is Map<String, dynamic> && payload.containsKey('data')) {
      return payload['data'];
    }
    return payload;
  }

  static String? _payloadMessage(dynamic payload) {
    if (payload is! Map) return null;

    final message = payload['message'];
    if (message is String && message.trim().isNotEmpty) return message;

    final error = payload['error'];
    if (error is String && error.trim().isNotEmpty) return error;
    if (error is Map) {
      final nested = error['message'];
      if (nested is String && nested.trim().isNotEmpty) return nested;
    }

    // express-validator mengirim daftar `errors: [{ msg, path }]`.
    final errors = payload['errors'];
    if (errors is List && errors.isNotEmpty) {
      final messages = errors
          .whereType<Map>()
          .map((entry) => entry['msg'] ?? entry['message'])
          .whereType<String>()
          .where((entry) => entry.trim().isNotEmpty)
          .toList();
      if (messages.isNotEmpty) return messages.join('\n');
    }

    return null;
  }

  static String? _requestId(dynamic payload) {
    if (payload is! Map) return null;
    final requestId = payload['requestId'];
    return requestId is String ? requestId : null;
  }
}
