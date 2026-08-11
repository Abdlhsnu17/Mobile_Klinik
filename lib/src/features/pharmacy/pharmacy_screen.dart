import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/json_utils.dart';
import '../../models/clinic_models.dart';
import '../../shared/widgets/common_widgets.dart';
import '../../shared/widgets/status_badge.dart';

/// Modul Farmasi (`/farmasi`) — verifikasi e-resep dan penyerahan obat.
///
/// Perpindahan status memakai endpoint alur kerja
/// (`/workflows/pharmacy/requests/:id/...`) supaya pengurangan stok dan
/// pencatatan mutasi batch (FEFO) tetap dilakukan server.
class PharmacyScreen extends ConsumerStatefulWidget {
  const PharmacyScreen({super.key});

  @override
  ConsumerState<PharmacyScreen> createState() => _PharmacyScreenState();
}

class _PharmacyScreenState extends ConsumerState<PharmacyScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Map<String, dynamic>>> _load() =>
      ref.read(collectionRepositoryProvider).list('pharmacy-requests');

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _runAction(
    Map<String, dynamic> request,
    String action,
    String successMessage, {
    Map<String, dynamic>? body,
  }) async {
    final id = asString(request['id']);

    try {
      await ref.read(collectionRepositoryProvider).post<dynamic>(
            '/workflows/pharmacy/requests/$id/$action',
            body: body,
          );
      if (!mounted) return;
      showAppSnackBar(context, successMessage);
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  Future<void> _verify(Map<String, dynamic> request) async {
    final notes = await _promptNotes(
      title: 'Verifikasi Resep',
      hint: 'Catatan verifikasi (opsional)',
      confirmLabel: 'Verifikasi',
    );
    if (notes == null) return;

    await _runAction(
      request,
      'verify',
      'Resep berhasil diverifikasi.',
      body: notes.isEmpty ? null : {'verificationNotes': notes},
    );
  }

  Future<void> _dispense(Map<String, dynamic> request) async {
    final notes = await _promptNotes(
      title: 'Serahkan Obat',
      hint: 'Catatan penyerahan (opsional)',
      confirmLabel: 'Serahkan',
    );
    if (notes == null) return;

    await _runAction(
      request,
      'dispense',
      'Obat berhasil diserahkan dan stok diperbarui.',
      body: notes.isEmpty ? null : {'dispensingNotes': notes},
    );
  }

  Future<void> _cancel(Map<String, dynamic> request) async {
    final confirmed = await confirmAction(
      context,
      title: 'Batalkan permintaan?',
      message: 'Permintaan resep ini akan ditandai batal.',
      confirmLabel: 'Batalkan',
    );
    if (!confirmed) return;

    await _runAction(request, 'cancel', 'Permintaan resep dibatalkan.');
  }

  /// Mengembalikan catatan yang diketik pengguna, atau null bila dibatalkan.
  Future<String?> _promptNotes({
    required String title,
    required String hint,
    required String confirmLabel,
  }) async {
    final controller = TextEditingController();

    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          maxLines: 3,
          autofocus: true,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(context).pop(controller.text.trim()),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );

    controller.dispose();
    return result;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
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
          final statuses = all
              .map((item) => asStringOrNull(item['status']))
              .whereType<String>()
              .toSet()
              .toList()
            ..sort();
          final visible = _statusFilter == null
              ? all
              : all
                  .where((item) => asStringOrNull(item['status']) == _statusFilter)
                  .toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              _PharmacySummary(requests: all),
              const SizedBox(height: 14),
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
                        selected: _statusFilter == null,
                        onSelected: (_) =>
                            setState(() => _statusFilter = null),
                      ),
                    ),
                    for (final status in statuses)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(
                            Formatters.humanizeSlug(status),
                            style: const TextStyle(fontSize: 12),
                          ),
                          selected: _statusFilter == status,
                          onSelected: (_) => setState(() => _statusFilter =
                              _statusFilter == status ? null : status),
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
                    icon: Icons.inventory_2_outlined,
                    title: 'Belum ada permintaan resep',
                    message:
                        'Permintaan muncul otomatis setelah dokter menyelesaikan pemeriksaan dengan resep.',
                  ),
                )
              else
                for (final request in visible)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _PrescriptionCard(
                      request: request,
                      onVerify: () => _verify(request),
                      onProcess: () => _runAction(
                        request,
                        'process',
                        'Resep sedang disiapkan.',
                      ),
                      onDispense: () => _dispense(request),
                      onCancel: () => _cancel(request),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _PharmacySummary extends StatelessWidget {
  const _PharmacySummary({required this.requests});

  final List<Map<String, dynamic>> requests;

  @override
  Widget build(BuildContext context) {
    int countWhere(Set<String> statuses) => requests
        .where((item) => statuses.contains(asStringOrNull(item['status'])))
        .length;

    return Row(
      children: [
        Expanded(
          child: StatCard(
            label: 'Menunggu verifikasi',
            value: Formatters.number(countWhere({'requested', 'pending'})),
            icon: Icons.pending_actions_outlined,
            tone: AppTheme.warning,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: StatCard(
            label: 'Sedang disiapkan',
            value: Formatters.number(countWhere({'processing', 'verified'})),
            icon: Icons.inventory_outlined,
            tone: AppTheme.info,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: StatCard(
            label: 'Sudah diserahkan',
            value: Formatters.number(countWhere({'fulfilled', 'dispensed'})),
            icon: Icons.check_circle_outline,
            tone: AppTheme.success,
          ),
        ),
      ],
    );
  }
}

class _PrescriptionCard extends StatelessWidget {
  const _PrescriptionCard({
    required this.request,
    required this.onVerify,
    required this.onProcess,
    required this.onDispense,
    required this.onCancel,
  });

  final Map<String, dynamic> request;
  final VoidCallback onVerify;
  final VoidCallback onProcess;
  final VoidCallback onDispense;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = asString(request['status']);

    // `items` dipakai skema baru, `prescription` oleh data lama.
    final items = asModelList(
      request['items'] ?? request['prescription'],
      Prescription.fromJson,
    );

    final canVerify = status == 'requested' || status == 'pending';
    final canProcess = status == 'verified';
    final canDispense = status == 'processing' || status == 'verified';
    final isClosed = {'fulfilled', 'dispensed', 'cancelled'}.contains(status);

    return Card(
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
                        asString(request['patientName'],
                            fallback: '(tanpa nama)'),
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        asString(request['doctorName'],
                            fallback: 'Dokter tidak tercatat'),
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: theme.colorScheme.outline),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status),
              ],
            ),
            const SizedBox(height: 10),
            if (items.isEmpty)
              Text(
                'Tidak ada rincian obat pada permintaan ini.',
                style: theme.textTheme.bodySmall,
              )
            else
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest
                      .withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    for (final item in items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                item.medicineName,
                                style: theme.textTheme.bodySmall
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                            Text(
                              '${item.dosage} · ${item.frequency} · ${item.quantity}',
                              style: theme.textTheme.labelSmall,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 8),
            Text(
              'Diminta ${Formatters.relative(request['requestedAt'])}',
              style: theme.textTheme.labelSmall
                  ?.copyWith(color: theme.colorScheme.outline),
            ),
            if (!isClosed) ...[
              const SizedBox(height: 6),
              Wrap(
                alignment: WrapAlignment.end,
                spacing: 8,
                children: [
                  TextButton(
                    onPressed: onCancel,
                    style: TextButton.styleFrom(
                      foregroundColor: theme.colorScheme.error,
                    ),
                    child: const Text('Batalkan'),
                  ),
                  if (canVerify)
                    FilledButton.tonal(
                      onPressed: onVerify,
                      child: const Text('Verifikasi'),
                    ),
                  if (canProcess)
                    FilledButton.tonal(
                      onPressed: onProcess,
                      child: const Text('Siapkan'),
                    ),
                  if (canDispense)
                    FilledButton(
                      onPressed: onDispense,
                      child: const Text('Serahkan'),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
