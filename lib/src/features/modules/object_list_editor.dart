import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/utils/formatters.dart';
import '../../core/utils/json_utils.dart';
import 'collection_config.dart';
import 'reference_field.dart';

/// Editor untuk field bertipe [FieldType.objectList].
///
/// Merender daftar objek bersarang (jadwal praktik dokter, baris purchase
/// order) sebagai kartu yang dapat ditambah dan dihapus, dengan sub-formulir
/// yang dibangun dari [CollectionField.itemFields].
class ObjectListEditor extends StatelessWidget {
  const ObjectListEditor({
    super.key,
    required this.field,
    required this.items,
    required this.onChanged,
    this.enabled = true,
    this.errorText,
  });

  final CollectionField field;
  final List<Map<String, dynamic>> items;
  final ValueChanged<List<Map<String, dynamic>>> onChanged;
  final bool enabled;
  final String? errorText;

  void _addItem() {
    final blank = <String, dynamic>{
      for (final sub in field.itemFields)
        if (sub.defaultValue != null) sub.name: sub.defaultValue,
    };
    onChanged([...items, blank]);
  }

  void _removeItem(int index) {
    final next = List<Map<String, dynamic>>.from(items)..removeAt(index);
    onChanged(next);
  }

  void _updateItem(int index, String name, dynamic value) {
    final next = List<Map<String, dynamic>>.from(items);
    // Salin map baris agar perubahan tidak memutasi objek yang sedang dibaca
    // widget lain.
    next[index] = {...next[index], name: value};
    onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                field.required ? '${field.label} *' : field.label,
                style: theme.textTheme.labelLarge
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            TextButton.icon(
              onPressed: enabled ? _addItem : null,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tambah'),
            ),
          ],
        ),
        if (field.helperText != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              field.helperText!,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.outline),
            ),
          ),
        if (items.isEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest
                  .withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Belum ada ${field.label.toLowerCase()}. Tekan "Tambah" untuk mengisi.',
              style: theme.textTheme.bodySmall,
            ),
          )
        else
          for (var index = 0; index < items.length; index++)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _ItemCard(
                // Kunci berbasis posisi menjaga controller sub-field tetap
                // terhubung ke baris yang benar saat daftar berubah.
                key: ValueKey('${field.name}-$index'),
                field: field,
                index: index,
                item: items[index],
                enabled: enabled,
                onRemove: () => _removeItem(index),
                onValueChanged: (name, value) =>
                    _updateItem(index, name, value),
              ),
            ),
        if (errorText != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              errorText!,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.error),
            ),
          ),
      ],
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({
    super.key,
    required this.field,
    required this.index,
    required this.item,
    required this.enabled,
    required this.onRemove,
    required this.onValueChanged,
  });

  final CollectionField field;
  final int index;
  final Map<String, dynamic> item;
  final bool enabled;
  final VoidCallback onRemove;
  final void Function(String name, dynamic value) onValueChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${index + 1}. ${field.describeItem(item)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20),
                color: theme.colorScheme.error,
                tooltip: 'Hapus baris',
                onPressed: enabled ? onRemove : null,
              ),
            ],
          ),
          for (final sub in field.itemFields)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: _SubField(
                field: sub,
                value: item[sub.name],
                enabled: enabled,
                onChanged: (value) => onValueChanged(sub.name, value),
                onReferenceSelected: (id, label) {
                  onValueChanged(sub.name, id);

                  // Nama pendamping (mis. `medicineName`) ikut terisi supaya
                  // baris tetap terbaca dan sesuai bentuk data backend.
                  final mirror = sub.referenceMirrorField;
                  if (mirror != null) onValueChanged(mirror, label);
                },
              ),
            ),
        ],
      ),
    );
  }
}

/// Satu kontrol input di dalam baris daftar bersarang.
class _SubField extends StatefulWidget {
  const _SubField({
    required this.field,
    required this.value,
    required this.enabled,
    required this.onChanged,
    required this.onReferenceSelected,
  });

  final CollectionField field;
  final dynamic value;
  final bool enabled;
  final ValueChanged<dynamic> onChanged;

  /// Dipanggil untuk [FieldType.reference] dengan id dan label terpilih.
  final void Function(String? id, String? label) onReferenceSelected;

  @override
  State<_SubField> createState() => _SubFieldState();
}

class _SubFieldState extends State<_SubField> {
  TextEditingController? _controller;

  bool get _usesTextController =>
      widget.field.type != FieldType.select &&
      widget.field.type != FieldType.switchToggle;

  @override
  void initState() {
    super.initState();
    if (_usesTextController) {
      _controller = TextEditingController(text: _asText(widget.value));
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  static String _asText(dynamic value) => asStringOrNull(value) ?? '';

  @override
  Widget build(BuildContext context) {
    final field = widget.field;
    final label = field.required ? '${field.label} *' : field.label;

    switch (field.type) {
      case FieldType.reference:
        return ReferenceField(
          field: field,
          value: asStringOrNull(widget.value),
          enabled: widget.enabled,
          isDense: true,
          onChanged: widget.onReferenceSelected,
        );

      case FieldType.select:
        return DropdownButtonFormField<String>(
          initialValue: asStringOrNull(widget.value),
          isExpanded: true,
          decoration: InputDecoration(labelText: label, isDense: true),
          items: [
            for (final option in field.options)
              DropdownMenuItem(value: option.value, child: Text(option.label)),
          ],
          onChanged: widget.enabled ? widget.onChanged : null,
          validator: (value) => field.required && (value == null || value.isEmpty)
              ? '${field.label} wajib dipilih'
              : null,
        );

      case FieldType.switchToggle:
        return SwitchListTile(
          value: asBool(widget.value),
          onChanged: widget.enabled ? widget.onChanged : null,
          title: Text(field.label, style: const TextStyle(fontSize: 13)),
          contentPadding: EdgeInsets.zero,
          dense: true,
        );

      case FieldType.time:
        return TextFormField(
          controller: _controller,
          enabled: widget.enabled,
          readOnly: true,
          decoration: InputDecoration(
            labelText: label,
            isDense: true,
            suffixIcon: const Icon(Icons.schedule, size: 18),
          ),
          validator: _validateRequired,
          onTap: () async {
            final picked = await showTimePicker(
              context: context,
              initialTime: _parseTime(_controller?.text) ?? TimeOfDay.now(),
            );
            if (picked == null) return;

            // Backend menyimpan jam sebagai teks "HH:mm".
            final text = '${picked.hour.toString().padLeft(2, '0')}:'
                '${picked.minute.toString().padLeft(2, '0')}';
            _controller?.text = text;
            widget.onChanged(text);
          },
        );

      case FieldType.date:
        return TextFormField(
          controller: _controller,
          enabled: widget.enabled,
          readOnly: true,
          decoration: InputDecoration(
            labelText: label,
            isDense: true,
            suffixIcon: const Icon(Icons.calendar_today_outlined, size: 16),
          ),
          validator: _validateRequired,
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate:
                  DateTime.tryParse(_controller?.text ?? '') ?? DateTime.now(),
              firstDate: DateTime(1900),
              lastDate: DateTime(2100),
            );
            if (picked == null) return;

            final text = Formatters.isoDate(picked);
            _controller?.text = text;
            widget.onChanged(text);
          },
        );

      default:
        return TextFormField(
          controller: _controller,
          enabled: widget.enabled,
          keyboardType:
              field.isNumeric ? TextInputType.number : TextInputType.text,
          inputFormatters: field.isNumeric
              ? [FilteringTextInputFormatter.allow(RegExp(r'[\d.,-]'))]
              : null,
          decoration: InputDecoration(
            labelText: label,
            isDense: true,
            helperText: field.helperText,
          ),
          validator: _validateRequired,
          // Nilai diteruskan sebagai tipe yang diharapkan backend (angka tetap
          // angka), bukan sebagai teks mentah.
          onChanged: (raw) => widget.onChanged(field.parseInput(raw)),
        );
    }
  }

  String? _validateRequired(String? value) {
    if (!widget.field.required) return null;
    return (value == null || value.trim().isEmpty)
        ? '${widget.field.label} wajib diisi'
        : null;
  }

  static TimeOfDay? _parseTime(String? value) {
    final parts = (value ?? '').split(':');
    if (parts.length < 2) return null;

    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    return TimeOfDay(hour: hour, minute: minute);
  }
}
