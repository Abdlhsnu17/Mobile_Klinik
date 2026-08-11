import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/report_models.dart';
import '../../shared/widgets/common_widgets.dart';

/// Pusat peringatan operasional (`/peringatan`).
///
/// Membaca `GET /alerts`, yang menghitung stok menipis, obat mendekati
/// kedaluwarsa, dan jadwal maintenance alat di sisi server.
class AlertsScreen extends ConsumerStatefulWidget {
  const AlertsScreen({super.key});

  @override
  ConsumerState<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends ConsumerState<AlertsScreen> {
  late Future<OperationalAlertsResponse> _future;
  AlertCategory? _categoryFilter;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<OperationalAlertsResponse> _load() async {
    final payload =
        await ref.read(collectionRepositoryProvider).get<Map<String, dynamic>>(
              '/alerts',
            );
    return OperationalAlertsResponse.fromJson(payload);
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<OperationalAlertsResponse>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorView(error: snapshot.error!, onRetry: _refresh);
          }

          final response = snapshot.data ?? OperationalAlertsResponse.empty;
          final visible = _categoryFilter == null
              ? response.alerts
              : response.alerts
                  .where((alert) => alert.category == _categoryFilter)
                  .toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Row(
                children: [
                  Expanded(
                    child: StatCard(
                      label: 'Total peringatan',
                      value: Formatters.number(response.summary.total),
                      icon: Icons.notifications_active_outlined,
                      tone: AppTheme.brandPrimary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatCard(
                      label: 'Kritis',
                      value: Formatters.number(response.summary.critical),
                      icon: Icons.error_outline,
                      tone: AppTheme.danger,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatCard(
                      label: 'Peringatan',
                      value: Formatters.number(response.summary.warning),
                      icon: Icons.warning_amber_outlined,
                      tone: AppTheme.warning,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (response.generatedAt.isNotEmpty)
                Text(
                  'Diperbarui ${Formatters.relative(response.generatedAt)}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.outline,
                      ),
                ),
              const SizedBox(height: 14),
              SizedBox(
                height: 36,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label:
                            const Text('Semua', style: TextStyle(fontSize: 12)),
                        selected: _categoryFilter == null,
                        onSelected: (_) =>
                            setState(() => _categoryFilter = null),
                      ),
                    ),
                    for (final category in AlertCategory.values)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(
                            '${category.label} (${response.summary.byCategory[category.value] ?? 0})',
                            style: const TextStyle(fontSize: 12),
                          ),
                          selected: _categoryFilter == category,
                          onSelected: (_) => setState(() => _categoryFilter =
                              _categoryFilter == category ? null : category),
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
                    icon: Icons.verified_outlined,
                    title: 'Tidak ada peringatan aktif',
                    message:
                        'Stok obat, masa kedaluwarsa, dan jadwal maintenance alat dalam kondisi aman.',
                  ),
                )
              else
                for (final alert in visible)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _AlertCard(alert: alert),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  const _AlertCard({required this.alert});

  final OperationalAlert alert;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCritical = alert.severity == AlertSeverity.critical;
    final color = isCritical ? AppTheme.danger : AppTheme.warning;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_iconFor(alert.category), size: 18, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          alert.title,
                          style: theme.textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          alert.severity.label,
                          style: TextStyle(
                            color: color,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(alert.detail, style: theme.textTheme.bodySmall),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    runSpacing: 4,
                    children: [
                      if (alert.category != null)
                        _MetaText(text: alert.category!.label),
                      if (alert.currentValue != null)
                        _MetaText(
                          text:
                              'Saat ini: ${Formatters.number(alert.currentValue)} ${alert.unit ?? ''}'
                                  .trim(),
                        ),
                      if (alert.thresholdValue != null)
                        _MetaText(
                          text:
                              'Ambang: ${Formatters.number(alert.thresholdValue)}',
                        ),
                      if (alert.daysRemaining != null)
                        _MetaText(
                          text: alert.daysRemaining! < 0
                              ? 'Terlewat ${alert.daysRemaining!.abs()} hari'
                              : 'Sisa ${alert.daysRemaining} hari',
                        ),
                      if (alert.dueDate != null)
                        _MetaText(text: 'Jatuh tempo ${Formatters.date(alert.dueDate)}'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static IconData _iconFor(AlertCategory? category) => switch (category) {
        AlertCategory.stokMenipis => Icons.inventory_2_outlined,
        AlertCategory.obatKadaluarsa => Icons.event_busy_outlined,
        AlertCategory.maintenanceAlat => Icons.build_outlined,
        null => Icons.notifications_outlined,
      };
}

class _MetaText extends StatelessWidget {
  const _MetaText({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.outline,
            ),
      );
}
