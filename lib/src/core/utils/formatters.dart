import 'package:intl/intl.dart';

/// Pemformat nilai untuk tampilan berbahasa Indonesia.
class Formatters {
  const Formatters._();

  static final NumberFormat _currency = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  static final NumberFormat _compactNumber = NumberFormat.decimalPattern('id_ID');

  static final DateFormat _dateOnly = DateFormat('d MMM yyyy', 'id_ID');
  static final DateFormat _dateLong = DateFormat('EEEE, d MMMM yyyy', 'id_ID');
  static final DateFormat _dateTime = DateFormat('d MMM yyyy HH:mm', 'id_ID');
  static final DateFormat _timeOnly = DateFormat('HH:mm', 'id_ID');
  static final DateFormat _isoDate = DateFormat('yyyy-MM-dd');

  static String currency(num? value) => _currency.format(value ?? 0);

  static String number(num? value) => _compactNumber.format(value ?? 0);

  /// Tanggal ringkas, mis. "5 Agu 2026". Mengembalikan [fallback] bila nilai
  /// tidak dapat diurai.
  static String date(dynamic value, {String fallback = '-'}) {
    final parsed = _parse(value);
    return parsed == null ? fallback : _dateOnly.format(parsed);
  }

  static String dateLong(dynamic value, {String fallback = '-'}) {
    final parsed = _parse(value);
    return parsed == null ? fallback : _dateLong.format(parsed);
  }

  static String dateTime(dynamic value, {String fallback = '-'}) {
    final parsed = _parse(value);
    return parsed == null ? fallback : _dateTime.format(parsed);
  }

  static String time(dynamic value, {String fallback = '-'}) {
    final parsed = _parse(value);
    return parsed == null ? fallback : _timeOnly.format(parsed);
  }

  /// Format tanggal yang diterima backend (`YYYY-MM-DD`).
  static String isoDate(DateTime value) => _isoDate.format(value);

  static String todayIso() => isoDate(DateTime.now());

  /// Jarak waktu relatif, mis. "3 menit lalu".
  static String relative(dynamic value, {String fallback = '-'}) {
    final parsed = _parse(value);
    if (parsed == null) return fallback;

    final diff = DateTime.now().difference(parsed);
    if (diff.isNegative) return date(value);
    if (diff.inMinutes < 1) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 30) return '${diff.inDays} hari lalu';
    return date(value);
  }

  /// Mengubah slug backend menjadi label terbaca,
  /// mis. "diterima-sebagian" -> "Diterima Sebagian".
  static String humanizeSlug(String? value) {
    final raw = value?.trim();
    if (raw == null || raw.isEmpty) return '-';

    return raw
        .replaceAll(RegExp(r'[-_]+'), ' ')
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }

  static DateTime? _parse(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value.toLocal();

    final raw = value.toString().trim();
    if (raw.isEmpty) return null;
    return DateTime.tryParse(raw)?.toLocal();
  }
}
