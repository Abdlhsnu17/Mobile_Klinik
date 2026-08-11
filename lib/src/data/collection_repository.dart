import '../core/api/api_client.dart';

/// Akses generik ke endpoint koleksi backend.
///
/// `registerCollectionRoutes` di backend mendaftarkan pola REST yang identik
/// untuk 32 koleksi (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`),
/// sehingga satu repositori cukup untuk melayani seluruh modul CRUD.
class CollectionRepository {
  const CollectionRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  /// Mengambil seluruh isi koleksi sebagai daftar map mentah.
  ///
  /// Data dibiarkan sebagai `Map<String, dynamic>` karena layar CRUD generik
  /// digerakkan oleh skema field, bukan kelas model per koleksi.
  Future<List<Map<String, dynamic>>> list(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final payload = await _api.get<dynamic>('/$path', query: query);
    return _asRecords(payload);
  }

  Future<Map<String, dynamic>?> getOne(String path, String id) async {
    final payload = await _api.get<dynamic>('/$path/$id');
    return _asRecord(payload);
  }

  Future<Map<String, dynamic>> create(
    String path,
    Map<String, dynamic> body,
  ) async {
    final payload = await _api.post<dynamic>('/$path', body: body);
    return _asRecord(payload) ?? const {};
  }

  Future<Map<String, dynamic>> update(
    String path,
    String id,
    Map<String, dynamic> body,
  ) async {
    final payload = await _api.put<dynamic>('/$path/$id', body: body);
    return _asRecord(payload) ?? const {};
  }

  Future<void> remove(String path, String id) =>
      _api.delete<void>('/$path/$id');

  /// Endpoint non-koleksi (laporan, peringatan, kasir, alur kerja).
  Future<T> get<T>(String path, {Map<String, dynamic>? query}) =>
      _api.get<T>(path, query: query);

  Future<T> post<T>(String path, {Object? body}) =>
      _api.post<T>(path, body: body);

  /// Sebagian endpoint mengembalikan daftar langsung, sebagian lagi
  /// membungkusnya di dalam objek (mis. `{ items: [...] }`).
  static List<Map<String, dynamic>> _asRecords(dynamic payload) {
    if (payload is List) {
      return payload
          .map(_asRecord)
          .whereType<Map<String, dynamic>>()
          .toList();
    }

    if (payload is Map) {
      for (final key in const ['items', 'data', 'results', 'rows']) {
        final nested = payload[key];
        if (nested is List) return _asRecords(nested);
      }
    }

    return const [];
  }

  static Map<String, dynamic>? _asRecord(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((k, v) => MapEntry(k.toString(), v));
    return null;
  }
}
