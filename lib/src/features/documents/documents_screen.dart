import 'dart:io';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/providers.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/json_utils.dart';
import '../../shared/widgets/common_widgets.dart';

/// Modul Unggahan (`/unggahan`) — penyimpanan dokumen operasional klinik.
///
/// Mengunggah lewat `POST /documents` (multipart) dan membuka berkas dengan
/// aplikasi bawaan perangkat.
class DocumentsScreen extends ConsumerStatefulWidget {
  const DocumentsScreen({super.key});

  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

const _documentCategories = [
  ('laporan-barang-masuk', 'Laporan Barang Masuk'),
  ('berita-surat-masuk', 'Berita / Surat Masuk'),
  ('komunikasi-antar-unit', 'Komunikasi Antar Unit'),
  ('lainnya', 'Lainnya'),
];

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  String? _categoryFilter;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Map<String, dynamic>>> _load() =>
      ref.read(collectionRepositoryProvider).list('documents');

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _upload() async {
    final picked = await FilePicker.platform.pickFiles(withData: false);
    final file = picked?.files.singleOrNull;
    if (file == null || file.path == null) return;
    if (!mounted) return;

    final details = await showDialog<_UploadDetails>(
      context: context,
      builder: (context) => _UploadDetailsDialog(fileName: file.name),
    );
    if (details == null || !mounted) return;

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path!, filename: file.name),
        'title': details.title,
        'category': details.category,
        if (details.description.isNotEmpty) 'description': details.description,
      });

      await ref
          .read(apiClientProvider)
          .upload<dynamic>('/documents', formData);

      if (!mounted) return;
      showAppSnackBar(context, 'Dokumen berhasil diunggah.');
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  Future<void> _delete(Map<String, dynamic> document) async {
    final confirmed = await confirmAction(
      context,
      title: 'Hapus dokumen?',
      message:
          '"${asString(document['title'])}" akan dihapus permanen beserta berkasnya.',
    );
    if (!confirmed) return;

    try {
      await ref
          .read(collectionRepositoryProvider)
          .remove('documents', asString(document['id']));
      if (!mounted) return;
      showAppSnackBar(context, 'Dokumen berhasil dihapus.');
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  /// Mengunduh lalu membuka dokumen dengan aplikasi bawaan perangkat.
  ///
  /// Berkas harus diambil lewat klien HTTP aplikasi karena endpoint dokumen
  /// memerlukan sesi; aplikasi eksternal tidak membawa cookie autentikasi
  /// sehingga membuka URL-nya langsung akan ditolak server.
  Future<void> _open(Map<String, dynamic> document) async {
    final id = asString(document['id']);
    if (id.isEmpty) return;

    showAppSnackBar(context, 'Menyiapkan dokumen...');

    try {
      final bytes = await ref
          .read(apiClientProvider)
          .download('/documents/$id/download');

      final directory = await getTemporaryDirectory();
      final fileName = asString(
        document['originalName'],
        fallback: asString(document['filename'], fallback: 'dokumen-$id'),
      );
      final file = File('${directory.path}/$fileName');
      await file.writeAsBytes(bytes, flush: true);

      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done && mounted) {
        showAppSnackBar(
          context,
          'Dokumen tersimpan di ${file.path}, tetapi tidak ada aplikasi yang dapat membukanya.',
          isError: true,
        );
      }
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _upload,
        icon: const Icon(Icons.upload_file),
        label: const Text('Unggah Dokumen'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ErrorView(error: snapshot.error!, onRetry: _refresh);
            }

            final all = snapshot.data ?? const <Map<String, dynamic>>[];
            final visible = _categoryFilter == null
                ? all
                : all
                    .where((item) =>
                        asStringOrNull(item['category']) == _categoryFilter)
                    .toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: const Text('Semua',
                              style: TextStyle(fontSize: 12)),
                          selected: _categoryFilter == null,
                          onSelected: (_) =>
                              setState(() => _categoryFilter = null),
                        ),
                      ),
                      for (final (value, label) in _documentCategories)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label:
                                Text(label, style: const TextStyle(fontSize: 12)),
                            selected: _categoryFilter == value,
                            onSelected: (_) => setState(() => _categoryFilter =
                                _categoryFilter == value ? null : value),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (visible.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: EmptyState(
                      icon: Icons.cloud_upload_outlined,
                      title: 'Belum ada dokumen',
                      message:
                          'Unggah laporan, surat masuk, atau dokumen operasional lain untuk disimpan terpusat.',
                    ),
                  )
                else
                  for (final document in visible)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _DocumentCard(
                        document: document,
                        onOpen: () => _open(document),
                        onDelete: () => _delete(document),
                      ),
                    ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  const _DocumentCard({
    required this.document,
    required this.onOpen,
    required this.onDelete,
  });

  final Map<String, dynamic> document;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mimeType = asString(document['mimeType']);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(_iconFor(mimeType), size: 28, color: theme.colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      asString(document['title'], fallback: '(tanpa judul)'),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      Formatters.humanizeSlug(
                        asStringOrNull(document['category']),
                      ),
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.outline),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${_formatSize(asInt(document['size']))} · diunggah ${Formatters.relative(document['uploadedAt'] ?? document['createdAt'])}',
                      style: theme.textTheme.labelSmall
                          ?.copyWith(color: theme.colorScheme.outline),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline),
                color: theme.colorScheme.error,
                tooltip: 'Hapus dokumen',
                onPressed: onDelete,
              ),
            ],
          ),
        ),
      ),
    );
  }

  static IconData _iconFor(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image_outlined;
    if (mimeType.contains('pdf')) return Icons.picture_as_pdf_outlined;
    if (mimeType.contains('sheet') || mimeType.contains('excel')) {
      return Icons.table_chart_outlined;
    }
    if (mimeType.contains('word') || mimeType.contains('document')) {
      return Icons.article_outlined;
    }
    return Icons.insert_drive_file_outlined;
  }

  static String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class _UploadDetails {
  const _UploadDetails({
    required this.title,
    required this.category,
    required this.description,
  });

  final String title;
  final String category;
  final String description;
}

/// Melengkapi metadata dokumen sebelum berkas dikirim ke server.
class _UploadDetailsDialog extends StatefulWidget {
  const _UploadDetailsDialog({required this.fileName});

  final String fileName;

  @override
  State<_UploadDetailsDialog> createState() => _UploadDetailsDialogState();
}

class _UploadDetailsDialogState extends State<_UploadDetailsDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  final _descriptionController = TextEditingController();
  String _category = _documentCategories.first.$1;

  @override
  void initState() {
    super.initState();
    // Nama berkas dipakai sebagai judul awal agar pengguna tinggal menyesuaikan.
    _titleController = TextEditingController(text: widget.fileName);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Detail Dokumen'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.fileName,
              style: Theme.of(context).textTheme.bodySmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Judul *'),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? 'Judul wajib diisi'
                  : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _category,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Kategori *'),
              items: [
                for (final (value, label) in _documentCategories)
                  DropdownMenuItem(value: value, child: Text(label)),
              ],
              onChanged: (value) =>
                  setState(() => _category = value ?? _category),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionController,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Deskripsi'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: () {
            if (!(_formKey.currentState?.validate() ?? false)) return;
            Navigator.of(context).pop(
              _UploadDetails(
                title: _titleController.text.trim(),
                category: _category,
                description: _descriptionController.text.trim(),
              ),
            );
          },
          child: const Text('Unggah'),
        ),
      ],
    );
  }
}
