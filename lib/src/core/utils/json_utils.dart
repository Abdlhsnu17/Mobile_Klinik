/// Pembaca JSON yang toleran terhadap variasi tipe dari backend.
///
/// Backend menyimpan data di MySQL dengan fallback JSON, sehingga sebuah field
/// numerik dapat tiba sebagai `int`, `double`, maupun `String`. Helper ini
/// menormalkannya agar model tidak melempar saat parsing.
library;

String? asStringOrNull(dynamic value) {
  if (value == null) return null;
  if (value is String) return value.isEmpty ? null : value;
  return value.toString();
}

String asString(dynamic value, {String fallback = ''}) =>
    asStringOrNull(value) ?? fallback;

int asInt(dynamic value, {int fallback = 0}) => asIntOrNull(value) ?? fallback;

int? asIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? double.tryParse(value)?.round();
  return null;
}

double asDouble(dynamic value, {double fallback = 0}) =>
    asDoubleOrNull(value) ?? fallback;

double? asDoubleOrNull(dynamic value) {
  if (value == null) return null;
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

/// MySQL mengembalikan boolean sebagai 0/1 dan kadang sebagai string.
bool asBool(dynamic value, {bool fallback = false}) =>
    asBoolOrNull(value) ?? fallback;

bool? asBoolOrNull(dynamic value) {
  if (value == null) return null;
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final normalized = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'ya'].contains(normalized)) return true;
    if (['false', '0', 'no', 'tidak'].contains(normalized)) return false;
  }
  return null;
}

DateTime? asDateTimeOrNull(dynamic value) {
  final raw = asStringOrNull(value);
  if (raw == null) return null;
  return DateTime.tryParse(raw)?.toLocal();
}

Map<String, dynamic>? asMapOrNull(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.map((k, v) => MapEntry(k.toString(), v));
  return null;
}

Map<String, dynamic> asMap(dynamic value) => asMapOrNull(value) ?? const {};

/// Daftar objek bersarang, mis. `schedules` pada dokter atau `items` pada PO.
List<Map<String, dynamic>> asMapList(dynamic value) {
  if (value is! List) return const [];
  return value.map(asMapOrNull).whereType<Map<String, dynamic>>().toList();
}

/// Daftar string, toleran terhadap nilai null di dalam array.
List<String> asStringList(dynamic value) {
  if (value is! List) return const [];
  return value.map(asStringOrNull).whereType<String>().toList();
}

List<T> asModelList<T>(dynamic value, T Function(Map<String, dynamic>) fromJson) =>
    asMapList(value).map(fromJson).toList();

/// Membuang entri null agar payload PUT/POST tidak menimpa field dengan null
/// secara tidak sengaja.
Map<String, dynamic> compactJson(Map<String, dynamic> json) {
  final result = <String, dynamic>{};
  json.forEach((key, value) {
    if (value != null) result[key] = value;
  });
  return result;
}
