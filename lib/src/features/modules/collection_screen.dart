import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/json_utils.dart';
import '../../shared/widgets/common_widgets.dart';
import '../../shared/widgets/status_badge.dart';
import 'collection_config.dart';
import 'collection_controller.dart';
import 'collection_form_sheet.dart';

/// Layar CRUD generik untuk modul berbasis koleksi.
///
/// Menyediakan pencarian, filter cepat, tarik-untuk-menyegarkan, panel detail,
/// serta tambah/ubah/hapus — semuanya digerakkan oleh [CollectionConfig].
class CollectionScreen extends ConsumerStatefulWidget {
  const CollectionScreen({super.key, required this.config, this.header});

  final CollectionConfig config;

  /// Konten tambahan di atas daftar (mis. kartu ringkasan modul).
  final Widget? header;

  @override
  ConsumerState<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends ConsumerState<CollectionScreen> {
  final _searchController = TextEditingController();

  CollectionConfig get _config => widget.config;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  CollectionController get _controller =>
      ref.read(collectionControllerProvider(_config.path).notifier);

  Future<void> _openCreateForm() async {
    await showCollectionForm(
      context,
      config: _config,
      onSubmit: (body) => _controller.create(body),
    );
  }

  Future<void> _openEditForm(Map<String, dynamic> record) async {
    final id = asString(record['id']);
    await showCollectionForm(
      context,
      config: _config,
      initialRecord: record,
      onSubmit: (body) => _controller.update(id, body),
    );
  }

  Future<void> _deleteRecord(Map<String, dynamic> record) async {
    final label = asString(record[_config.titleField], fallback: 'data ini');
    final confirmed = await confirmAction(
      context,
      title: 'Hapus ${_config.singular}?',
      message: '"$label" akan dihapus permanen dan tidak dapat dikembalikan.',
    );
    if (!confirmed) return;

    try {
      await _controller.remove(asString(record['id']));
      if (!mounted) return;
      showAppSnackBar(context, '${_config.singular} berhasil dihapus.');
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(collectionControllerProvider(_config.path));
    final visibleRecords = _visibleRecords(state);

    return Scaffold(
      floatingActionButton: _config.canCreate
          ? FloatingActionButton.extended(
              onPressed: _openCreateForm,
              icon: const Icon(Icons.add),
              label: Text('Tambah ${_config.singular}'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () => _controller.load(),
        child: CustomScrollView(
          slivers: [
            if (widget.header != null)
              SliverToBoxAdapter(child: widget.header!),
            SliverToBoxAdapter(child: _buildToolbar(state)),
            if (state.isLoading && state.records.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state.error != null && state.records.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorView(
                  error: state.error!,
                  onRetry: () => _controller.load(),
                ),
              )
            else if (visibleRecords.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  icon: _config.icon,
                  title: state.records.isEmpty
                      ? 'Belum ada ${_config.singular.toLowerCase()}'
                      : 'Tidak ada hasil yang cocok',
                  message: state.records.isEmpty
                      ? _config.emptyMessage
                      : 'Ubah kata kunci atau filter untuk melihat data lain.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                sliver: SliverList.separated(
                  itemCount: visibleRecords.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) => _RecordCard(
                    config: _config,
                    record: visibleRecords[index],
                    onEdit: _config.canEdit
                        ? () => _openEditForm(visibleRecords[index])
                        : null,
                    onDelete: _config.canDelete
                        ? () => _deleteRecord(visibleRecords[index])
                        : null,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Menerapkan pencarian dan filter chip ke data yang sudah diurutkan.
  List<Map<String, dynamic>> _visibleRecords(CollectionState state) {
    final filterName = _config.filterField;

    final filtered = state.records.where((record) {
      if (!_config.matchesQuery(record, state.query)) return false;
      if (state.filter == null || filterName == null) return true;
      return asStringOrNull(record[filterName]) == state.filter;
    }).toList();

    return _config.sortRecords(filtered);
  }

  Widget _buildToolbar(CollectionState state) {
    final filterValues = _config.filterValues(state.records);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SearchField(
            controller: _searchController,
            hintText: 'Cari ${_config.title.toLowerCase()}...',
            onChanged: (value) {
              _controller.setQuery(value);
              // Rebuild agar tombol bersihkan muncul/menghilang.
              setState(() {});
            },
          ),
          if (filterValues.isNotEmpty) ...[
            const SizedBox(height: 10),
            SizedBox(
              height: 34,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _FilterChip(
                    label: 'Semua',
                    isSelected: state.filter == null,
                    onSelected: () => _controller.setFilter(null),
                  ),
                  for (final value in filterValues)
                    _FilterChip(
                      label: _config
                              .fieldByName(_config.filterField!)
                              ?.display(value) ??
                          value,
                      isSelected: state.filter == value,
                      onSelected: () => _controller.setFilter(
                        state.filter == value ? null : value,
                      ),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 6),
          Text(
            '${_visibleRecords(state).length} dari ${state.records.length} data',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: isSelected,
        onSelected: (_) => onSelected(),
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}

/// Kartu ringkas satu record, dapat diketuk untuk membuka detail lengkap.
class _RecordCard extends StatelessWidget {
  const _RecordCard({
    required this.config,
    required this.record,
    this.onEdit,
    this.onDelete,
  });

  final CollectionConfig config;
  final Map<String, dynamic> record;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = asString(record[config.titleField], fallback: '(tanpa nama)');
    final subtitle = config.subtitleField == null
        ? null
        : asStringOrNull(record[config.subtitleField!]);
    final status = config.statusField == null
        ? null
        : asStringOrNull(record[config.statusField!]);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showDetail(context),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        if (subtitle != null && subtitle.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              subtitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(color: theme.colorScheme.outline),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (status != null) ...[
                    const SizedBox(width: 8),
                    StatusBadge(status),
                  ],
                ],
              ),
              if (config.listFields.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 16,
                  runSpacing: 6,
                  children: [
                    for (final field in config.listFields)
                      _InlineStat(
                        label: field.label,
                        value: field.display(record[field.name]),
                      ),
                  ],
                ),
              ],
              if (onEdit != null || onDelete != null) ...[
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (onEdit != null)
                      TextButton.icon(
                        onPressed: onEdit,
                        icon: const Icon(Icons.edit_outlined, size: 16),
                        label: const Text('Ubah'),
                      ),
                    if (onDelete != null)
                      TextButton.icon(
                        onPressed: onDelete,
                        icon: const Icon(Icons.delete_outline, size: 16),
                        label: const Text('Hapus'),
                        style: TextButton.styleFrom(
                          foregroundColor: theme.colorScheme.error,
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            Text(
              asString(record[config.titleField], fallback: '(tanpa nama)'),
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            const Divider(),
            for (final field in config.fields)
              DetailRow(
                label: field.label,
                value: field.display(record[field.name]),
              ),
          ],
        ),
      ),
    );
  }
}

class _InlineStat extends StatelessWidget {
  const _InlineStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall
              ?.copyWith(color: theme.colorScheme.outline),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium
              ?.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
