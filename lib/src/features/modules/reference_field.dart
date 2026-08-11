import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/json_utils.dart';
import 'collection_config.dart';
import 'collection_controller.dart';

/// Pemilih record dari koleksi lain untuk field bertipe [FieldType.reference].
///
/// Menggantikan pengetikan id mentah dengan daftar pilihan yang dimuat dari
/// backend. Saat sebuah pilihan dipilih, label ikut dikirim ke pemanggil agar
/// field pendamping (mis. `medicineName`) dapat diisi bersamaan.
class ReferenceField extends ConsumerWidget {
  const ReferenceField({
    super.key,
    required this.field,
    required this.value,
    required this.enabled,
    required this.onChanged,
    this.isDense = false,
  });

  final CollectionField field;
  final String? value;
  final bool enabled;

  /// Dipanggil dengan id terpilih beserta labelnya (null bila dikosongkan).
  final void Function(String? id, String? label) onChanged;

  final bool isDense;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final path = field.referencePath;
    final label = field.required ? '${field.label} *' : field.label;

    if (path == null) {
      return const SizedBox.shrink();
    }

    final options = ref.watch(referenceOptionsProvider(path));

    return options.when(
      loading: () => InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          isDense: isDense,
          helperText: 'Memuat pilihan...',
        ),
        child: const SizedBox(
          height: 18,
          child: LinearProgressIndicator(minHeight: 2),
        ),
      ),
      error: (error, _) => InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          isDense: isDense,
          errorText: 'Gagal memuat pilihan',
        ),
        // Tetap sediakan cara mencoba lagi supaya formulir tidak buntu ketika
        // koleksi acuan gagal dimuat.
        child: TextButton.icon(
          onPressed: () => ref.invalidate(referenceOptionsProvider(path)),
          icon: const Icon(Icons.refresh, size: 16),
          label: const Text('Coba lagi'),
        ),
      ),
      data: (records) {
        final entries = [
          for (final record in records)
            (
              id: asString(record['id']),
              label: asString(
                record[field.referenceLabelField],
                fallback: asString(record['id']),
              ),
            ),
        ]..sort((a, b) => a.label.compareTo(b.label));

        // Nilai tersimpan yang recordnya sudah dihapus tidak boleh membuat
        // Dropdown melempar; perlakukan sebagai belum dipilih.
        final hasValue = entries.any((entry) => entry.id == value);

        return DropdownButtonFormField<String>(
          initialValue: hasValue ? value : null,
          isExpanded: true,
          decoration: InputDecoration(
            labelText: label,
            isDense: isDense,
            helperText: field.helperText,
          ),
          items: [
            if (!field.required)
              const DropdownMenuItem<String>(child: Text('— Tidak dipilih —')),
            for (final entry in entries)
              DropdownMenuItem<String>(
                value: entry.id,
                child: Text(entry.label, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: enabled
              ? (selected) {
                  final match = entries
                      .where((entry) => entry.id == selected)
                      .firstOrNull;
                  onChanged(selected, match?.label);
                }
              : null,
          validator: (selected) =>
              field.required && (selected == null || selected.isEmpty)
                  ? '${field.label} wajib dipilih'
                  : null,
        );
      },
    );
  }
}
