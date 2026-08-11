import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../core/utils/json_utils.dart';

/// Skema deklaratif untuk modul berbasis koleksi.
///
/// Backend mendaftarkan pola REST yang sama untuk 32 koleksi, sehingga sebuah
/// layar CRUD generik cukup digerakkan oleh konfigurasi field seperti ini —
/// jauh lebih ringkas dan konsisten dibanding menulis ulang satu halaman per
/// koleksi seperti di frontend Next.js.

/// Jenis kontrol input yang tersedia di formulir.
enum FieldType {
  text,
  multiline,
  number,
  currency,
  email,
  phone,
  date,
  time,
  select,
  switchToggle,

  /// Daftar objek bersarang, mis. `schedules` pada dokter atau `items` pada
  /// purchase order. Sub-skemanya dideklarasikan lewat
  /// [CollectionField.itemFields].
  objectList,

  /// Acuan ke record koleksi lain (mis. `medicineId` -> `medicines`).
  /// Pilihannya dimuat dari backend sehingga pengguna memilih nama, bukan
  /// mengetik id mentah.
  reference,
}

class FieldOption {
  const FieldOption(this.value, [String? label]) : _label = label;

  final String value;
  final String? _label;

  String get label => _label ?? Formatters.humanizeSlug(value);
}

/// Definisi satu field koleksi: cara menampilkan sekaligus cara menyunting.
class CollectionField {
  const CollectionField({
    required this.name,
    required this.label,
    this.type = FieldType.text,
    this.options = const [],
    this.required = false,
    this.readOnly = false,
    this.helperText,
    this.defaultValue,
    this.showInList = false,
    this.searchable = false,
    this.itemFields = const [],
    this.itemLabel,
    this.referencePath,
    this.referenceLabelField = 'name',
    this.referenceMirrorField,
  });

  /// Path koleksi sumber pilihan untuk [FieldType.reference].
  final String? referencePath;

  /// Field pada record acuan yang ditampilkan sebagai label pilihan.
  final String referenceLabelField;

  /// Field pendamping yang ikut diisi dengan label terpilih.
  ///
  /// Backend menyimpan sebagian nama secara denormalisasi (`medicineName`
  /// bersama `medicineId`), sehingga keduanya harus terkirim bersamaan.
  final String? referenceMirrorField;

  /// Sub-skema untuk [FieldType.objectList].
  final List<CollectionField> itemFields;

  /// Menyusun judul ringkas tiap baris daftar bersarang.
  final String Function(Map<String, dynamic> item)? itemLabel;

  final String name;
  final String label;
  final FieldType type;
  final List<FieldOption> options;
  final bool required;

  /// Field yang diisi server (mis. `createdAt`, `queueNumber`) — tampil di
  /// detail tetapi tidak dapat disunting.
  final bool readOnly;

  final String? helperText;
  final Object? defaultValue;

  /// Tampilkan sebagai baris ringkas di kartu daftar.
  final bool showInList;

  /// Ikut dicocokkan oleh kolom pencarian.
  final bool searchable;

  bool get isNumeric => type == FieldType.number || type == FieldType.currency;

  /// Merender nilai mentah menjadi teks yang terbaca pengguna.
  String display(dynamic value) {
    if (value == null) return '-';

    switch (type) {
      case FieldType.currency:
        return Formatters.currency(asDoubleOrNull(value));
      case FieldType.number:
        return Formatters.number(asDoubleOrNull(value) ?? 0);
      case FieldType.date:
        return Formatters.date(value);
      case FieldType.switchToggle:
        return asBool(value) ? 'Ya' : 'Tidak';
      case FieldType.select:
        final raw = asString(value);
        final match = options.where((option) => option.value == raw);
        return match.isEmpty ? Formatters.humanizeSlug(raw) : match.first.label;
      case FieldType.objectList:
        final items = asMapList(value);
        if (items.isEmpty) return '-';
        // Ringkas beberapa baris pertama agar kartu daftar tetap informatif.
        final labels = items.take(2).map(describeItem).toList();
        return items.length > labels.length
            ? '${labels.join(', ')} +${items.length - labels.length} lainnya'
            : labels.join(', ');
      case FieldType.reference:
      case FieldType.time:
      case FieldType.text:
      case FieldType.multiline:
      case FieldType.email:
      case FieldType.phone:
        // Objek/array bersarang (mis. `schedules`, `items`) tidak punya editor
        // khusus; tampilkan ringkasannya saja. Pemeriksaan ini harus mendahului
        // konversi ke string, yang akan mencetak isi array mentah.
        if (value is List) return value.isEmpty ? '-' : '${value.length} item';
        if (value is Map) return value.isEmpty ? '-' : '${value.length} field';
        return asStringOrNull(value) ?? '-';
    }
  }

  /// Judul ringkas satu baris daftar bersarang.
  ///
  /// Memakai [itemLabel] bila disediakan; selain itu jatuh ke field teks
  /// pertama pada sub-skema.
  String describeItem(Map<String, dynamic> item) {
    final custom = itemLabel?.call(item);
    if (custom != null && custom.trim().isNotEmpty) return custom;

    for (final field in itemFields) {
      final value = asStringOrNull(item[field.name]);
      if (value != null) return value;
    }
    return '(tanpa nama)';
  }

  /// Mengubah masukan formulir menjadi tipe yang diharapkan backend.
  Object? parseInput(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;

    if (isNumeric) {
      // Terima "12.500" maupun "12500" — pemisah ribuan dibuang lebih dulu.
      final digits = trimmed.replaceAll(RegExp(r'[^\d,.-]'), '');
      final normalized = digits.contains(',') && !digits.contains('.')
          ? digits.replaceAll(',', '.')
          : digits.replaceAll('.', '');
      return type == FieldType.number
          ? (int.tryParse(normalized) ?? double.tryParse(normalized))
          : (double.tryParse(normalized) ?? int.tryParse(normalized));
    }

    return trimmed;
  }
}

/// Konfigurasi lengkap sebuah modul koleksi.
class CollectionConfig {
  const CollectionConfig({
    required this.path,
    required this.title,
    required this.singular,
    required this.fields,
    required this.titleField,
    this.subtitleField,
    this.statusField,
    this.emptyMessage,
    this.canCreate = true,
    this.canEdit = true,
    this.canDelete = true,
    this.filterField,
    this.sortDescendingBy,
    this.icon = Icons.folder_outlined,
    this.deriveFields,
  });

  /// Menghitung field turunan sebelum payload dikirim.
  ///
  /// Dipakai ketika backend mengharapkan nilai yang tidak diketik pengguna
  /// tetapi juga tidak dihitung server — mis. `totalAmount` purchase order,
  /// yang berasal dari penjumlahan baris `items`.
  final Map<String, dynamic> Function(Map<String, dynamic> body)? deriveFields;

  /// Segmen path REST, mis. `medical-codes` untuk `/api/medical-codes`.
  final String path;

  final String title;

  /// Bentuk tunggal untuk label tombol dan dialog ("Tambah Pasien").
  final String singular;

  final List<CollectionField> fields;

  /// Field yang dipakai sebagai judul kartu daftar.
  final String titleField;

  final String? subtitleField;

  /// Field status yang dirender sebagai lencana berwarna.
  final String? statusField;

  final String? emptyMessage;
  final bool canCreate;
  final bool canEdit;
  final bool canDelete;

  /// Field untuk chip filter cepat di atas daftar (biasanya sama dengan
  /// [statusField] atau sebuah kategori).
  final String? filterField;

  /// Field tanggal untuk mengurutkan data terbaru lebih dulu.
  final String? sortDescendingBy;

  final IconData icon;

  List<CollectionField> get listFields =>
      fields.where((field) => field.showInList).toList();

  List<CollectionField> get editableFields =>
      fields.where((field) => !field.readOnly).toList();

  List<CollectionField> get searchableFields {
    final explicit = fields.where((field) => field.searchable).toList();
    if (explicit.isNotEmpty) return explicit;

    // Tanpa penandaan eksplisit, pencarian jatuh ke judul dan subjudul.
    return fields
        .where((field) => field.name == titleField || field.name == subtitleField)
        .toList();
  }

  CollectionField? fieldByName(String name) {
    for (final field in fields) {
      if (field.name == name) return field;
    }
    return null;
  }

  /// Nilai unik yang tersedia untuk chip filter, diurutkan alfabetis.
  List<String> filterValues(List<Map<String, dynamic>> records) {
    final name = filterField;
    if (name == null) return const [];

    final values = records
        .map((record) => asStringOrNull(record[name]))
        .whereType<String>()
        .toSet()
        .toList()
      ..sort();
    return values;
  }

  /// Mencocokkan sebuah record dengan kata kunci pencarian.
  bool matchesQuery(Map<String, dynamic> record, String query) {
    final needle = query.trim().toLowerCase();
    if (needle.isEmpty) return true;

    return searchableFields.any((field) {
      final value = asStringOrNull(record[field.name]);
      return value != null && value.toLowerCase().contains(needle);
    });
  }

  /// Mengurutkan data terbaru lebih dulu bila [sortDescendingBy] diisi.
  List<Map<String, dynamic>> sortRecords(List<Map<String, dynamic>> records) {
    final key = sortDescendingBy;
    if (key == null) return records;

    final sorted = List<Map<String, dynamic>>.from(records);
    sorted.sort((a, b) {
      final left = asStringOrNull(a[key]) ?? '';
      final right = asStringOrNull(b[key]) ?? '';
      return right.compareTo(left);
    });
    return sorted;
  }
}
