import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/utils/formatters.dart';
import '../../core/utils/json_utils.dart';
import '../../shared/widgets/common_widgets.dart';
import 'collection_config.dart';
import 'object_list_editor.dart';
import 'reference_field.dart';

/// Formulir tambah/ubah data yang dibangun dari [CollectionConfig].
///
/// Mengembalikan `true` lewat `Navigator.pop` bila penyimpanan berhasil,
/// sehingga pemanggil dapat memuat ulang daftar.
class CollectionFormSheet extends StatefulWidget {
  const CollectionFormSheet({
    super.key,
    required this.config,
    required this.onSubmit,
    this.initialRecord,
  });

  final CollectionConfig config;

  /// Record yang sedang disunting; null berarti pembuatan data baru.
  final Map<String, dynamic>? initialRecord;

  final Future<void> Function(Map<String, dynamic> body) onSubmit;

  @override
  State<CollectionFormSheet> createState() => _CollectionFormSheetState();
}

class _CollectionFormSheetState extends State<CollectionFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _textControllers = {};
  final Map<String, String?> _selectValues = {};
  final Map<String, bool> _switchValues = {};
  final Map<String, List<Map<String, dynamic>>> _listValues = {};

  /// Pesan validasi untuk daftar bersarang, yang tidak ditangani
  /// [FormState.validate] karena bukan sebuah [FormField].
  final Map<String, String> _listErrors = {};

  bool _isSaving = false;
  String? _error;

  bool get _isEditing => widget.initialRecord != null;

  @override
  void initState() {
    super.initState();
    _seedInitialValues();
  }

  @override
  void dispose() {
    for (final controller in _textControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _seedInitialValues() {
    final record = widget.initialRecord;

    for (final field in widget.config.editableFields) {
      final raw = record?[field.name] ?? field.defaultValue;

      switch (field.type) {
        case FieldType.select:
        case FieldType.reference:
          _selectValues[field.name] = asStringOrNull(raw);
        case FieldType.switchToggle:
          _switchValues[field.name] = asBool(raw);
        case FieldType.objectList:
          // Salin tiap baris agar penyuntingan tidak memutasi record asli yang
          // masih ditampilkan di daftar di belakang formulir.
          _listValues[field.name] = asMapList(raw)
              .map((item) => Map<String, dynamic>.from(item))
              .toList();
        default:
          _textControllers[field.name] =
              TextEditingController(text: _initialText(field, raw));
      }
    }
  }

  static String _initialText(CollectionField field, dynamic raw) {
    if (raw == null) return '';
    // Angka ditampilkan polos agar mudah disunting; pemformatan ribuan hanya
    // dipakai di tampilan baca.
    if (field.isNumeric) return asStringOrNull(raw) ?? '';
    if (field.type == FieldType.date) {
      final parsed = DateTime.tryParse(raw.toString());
      return parsed == null ? raw.toString() : Formatters.isoDate(parsed);
    }
    return raw.toString();
  }

  /// Memeriksa daftar bersarang yang wajib diisi.
  ///
  /// Backend menolak `items` kosong pada purchase order
  /// (`isArray({ min: 1 })`), jadi hal itu dicegah lebih dulu di sini.
  bool _validateLists() {
    _listErrors.clear();

    for (final field in widget.config.editableFields) {
      if (field.type != FieldType.objectList || !field.required) continue;

      if ((_listValues[field.name] ?? const []).isEmpty) {
        _listErrors[field.name] = 'Minimal satu ${field.label.toLowerCase()} harus diisi.';
      }
    }

    return _listErrors.isEmpty;
  }

  Future<void> _submit() async {
    final isFormValid = _formKey.currentState?.validate() ?? false;
    final areListsValid = _validateLists();

    if (!isFormValid || !areListsValid) {
      // Tampilkan pesan daftar bersarang yang baru saja dihitung.
      setState(() {});
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      await widget.onSubmit(_buildBody());
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _error = error.toString();
      });
    }
  }

  /// Menyusun payload untuk backend.
  ///
  /// Saat menyunting, field kosong tetap dikirim sebagai string kosong agar
  /// pengguna dapat mengosongkan isian; saat membuat data baru, field kosong
  /// dibuang supaya nilai bawaan server yang dipakai.
  Map<String, dynamic> _buildBody() {
    final body = <String, dynamic>{};

    for (final field in widget.config.editableFields) {
      switch (field.type) {
        case FieldType.select:
        case FieldType.reference:
          final value = _selectValues[field.name];
          if (value != null) body[field.name] = value;
        case FieldType.switchToggle:
          body[field.name] = _switchValues[field.name] ?? false;
        case FieldType.objectList:
          final items = _listValues[field.name] ?? const [];
          // Daftar kosong tetap dikirim saat menyunting agar pengguna dapat
          // menghapus seluruh baris.
          if (items.isNotEmpty || _isEditing) {
            body[field.name] = items.map(compactJson).toList();
          }
        default:
          final raw = _textControllers[field.name]?.text ?? '';
          final parsed = field.parseInput(raw);
          if (parsed != null) {
            body[field.name] = parsed;
          } else if (_isEditing) {
            body[field.name] = '';
          }
      }
    }

    // Field turunan (mis. totalAmount purchase order) dihitung terakhir agar
    // dapat membaca seluruh isian yang sudah terkumpul.
    final derived = widget.config.deriveFields?.call(body);
    if (derived != null) body.addAll(derived);

    return body;
  }

  @override
  Widget build(BuildContext context) {
    final config = widget.config;
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Column(
          children: [
            _SheetHandle(
              title: _isEditing
                  ? 'Ubah ${config.singular}'
                  : 'Tambah ${config.singular}',
            ),
            const Divider(height: 1),
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  children: [
                    if (_error != null) ...[
                      _FormErrorBanner(message: _error!),
                      const SizedBox(height: 16),
                    ],
                    for (final field in config.editableFields) ...[
                      _buildField(field),
                      const SizedBox(height: 14),
                    ],
                  ],
                ),
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isSaving
                            ? null
                            : () => Navigator.of(context).pop(false),
                        child: const Text('Batal'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: _isSaving ? null : _submit,
                        child: _isSaving
                            ? const SizedBox(
                                height: 16,
                                width: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Simpan'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(CollectionField field) {
    switch (field.type) {
      case FieldType.select:
        return DropdownButtonFormField<String>(
          initialValue: _selectValues[field.name],
          decoration: InputDecoration(
            labelText: _labelFor(field),
            helperText: field.helperText,
          ),
          items: [
            if (!field.required)
              const DropdownMenuItem<String>(
                child: Text('— Tidak dipilih —'),
              ),
            for (final option in field.options)
              DropdownMenuItem<String>(
                value: option.value,
                child: Text(option.label),
              ),
          ],
          onChanged: _isSaving
              ? null
              : (value) => setState(() => _selectValues[field.name] = value),
          validator: (value) => field.required && (value == null || value.isEmpty)
              ? '${field.label} wajib dipilih'
              : null,
        );

      case FieldType.switchToggle:
        return SwitchListTile(
          value: _switchValues[field.name] ?? false,
          onChanged: _isSaving
              ? null
              : (value) => setState(() => _switchValues[field.name] = value),
          title: Text(field.label),
          subtitle: field.helperText == null ? null : Text(field.helperText!),
          contentPadding: EdgeInsets.zero,
        );

      case FieldType.reference:
        return ReferenceField(
          field: field,
          value: _selectValues[field.name],
          enabled: !_isSaving,
          onChanged: (id, label) => setState(() {
            _selectValues[field.name] = id;

            // Isi otomatis field nama pendamping yang disimpan backend secara
            // denormalisasi, mis. `supplierName` di samping `supplierId`.
            final mirror = field.referenceMirrorField;
            if (mirror != null && label != null) {
              _textControllers[mirror]?.text = label;
            }
          }),
        );

      case FieldType.objectList:
        return ObjectListEditor(
          field: field,
          items: _listValues[field.name] ?? const [],
          enabled: !_isSaving,
          errorText: _listErrors[field.name],
          onChanged: (items) => setState(() {
            _listValues[field.name] = items;
            _listErrors.remove(field.name);
          }),
        );

      case FieldType.date:
        return _DateField(
          controller: _textControllers[field.name]!,
          field: field,
          label: _labelFor(field),
          enabled: !_isSaving,
          validator: (value) => _validateRequired(field, value),
        );

      default:
        return TextFormField(
          controller: _textControllers[field.name],
          enabled: !_isSaving,
          maxLines: field.type == FieldType.multiline ? 4 : 1,
          keyboardType: _keyboardType(field),
          inputFormatters: field.isNumeric
              ? [FilteringTextInputFormatter.allow(RegExp(r'[\d.,-]'))]
              : null,
          textCapitalization: field.type == FieldType.email
              ? TextCapitalization.none
              : TextCapitalization.sentences,
          decoration: InputDecoration(
            labelText: _labelFor(field),
            helperText: field.helperText,
          ),
          validator: (value) => _validateRequired(field, value),
        );
    }
  }

  String _labelFor(CollectionField field) =>
      field.required ? '${field.label} *' : field.label;

  String? _validateRequired(CollectionField field, String? value) {
    if (!field.required) return null;
    return (value == null || value.trim().isEmpty)
        ? '${field.label} wajib diisi'
        : null;
  }

  static TextInputType _keyboardType(CollectionField field) =>
      switch (field.type) {
        FieldType.number || FieldType.currency => TextInputType.number,
        FieldType.email => TextInputType.emailAddress,
        FieldType.phone => TextInputType.phone,
        FieldType.multiline => TextInputType.multiline,
        _ => TextInputType.text,
      };
}

/// Kolom tanggal dengan pemilih kalender; nilainya disimpan sebagai
/// `YYYY-MM-DD` sesuai format yang diterima backend.
class _DateField extends StatelessWidget {
  const _DateField({
    required this.controller,
    required this.field,
    required this.label,
    required this.enabled,
    required this.validator,
  });

  final TextEditingController controller;
  final CollectionField field;
  final String label;
  final bool enabled;
  final FormFieldValidator<String> validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      readOnly: true,
      decoration: InputDecoration(
        labelText: label,
        helperText: field.helperText,
        suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18),
      ),
      validator: validator,
      onTap: () async {
        final current = DateTime.tryParse(controller.text) ?? DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: current,
          firstDate: DateTime(1900),
          lastDate: DateTime(2100),
        );
        if (picked != null) controller.text = Formatters.isoDate(picked);
      },
    );
  }
}

class _SheetHandle extends StatelessWidget {
  const _SheetHandle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close),
            tooltip: 'Tutup',
            onPressed: () => Navigator.of(context).pop(false),
          ),
        ],
      ),
    );
  }
}

class _FormErrorBanner extends StatelessWidget {
  const _FormErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, size: 18, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }
}

/// Membuka formulir koleksi sebagai bottom sheet.
Future<bool> showCollectionForm(
  BuildContext context, {
  required CollectionConfig config,
  required Future<void> Function(Map<String, dynamic> body) onSubmit,
  Map<String, dynamic>? initialRecord,
}) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => CollectionFormSheet(
      config: config,
      initialRecord: initialRecord,
      onSubmit: onSubmit,
    ),
  );

  if (saved == true && context.mounted) {
    showAppSnackBar(context, '${config.singular} berhasil disimpan.');
  }

  return saved ?? false;
}
