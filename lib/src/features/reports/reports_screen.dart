import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/json_utils.dart';
import '../../models/report_models.dart';
import '../../shared/widgets/common_widgets.dart';

/// Modul Laporan (`/laporan`).
///
/// Menampilkan laporan kunjungan, morbiditas, keuangan, dan laba-rugi dari
/// endpoint `/reports/*`. Rentang tanggal dikirim sebagai query `from`/`to`
/// seperti yang diharapkan backend.
class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  late DateTimeRange _range;
  late Future<_ReportsData> _future;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    // Bawaan: bulan berjalan.
    _range = DateTimeRange(start: DateTime(now.year, now.month), end: now);
    _future = _load();
  }

  Future<_ReportsData> _load() async {
    final repository = ref.read(collectionRepositoryProvider);
    final query = {
      'from': Formatters.isoDate(_range.start),
      'to': Formatters.isoDate(_range.end),
    };

    // Tiap laporan dimuat terpisah agar satu kegagalan tidak mengosongkan
    // seluruh halaman.
    Future<dynamic> safeGet(String path) async {
      try {
        return await repository.get<dynamic>(path, query: query);
      } catch (_) {
        return null;
      }
    }

    final results = await Future.wait([
      safeGet('/reports/kunjungan'),
      safeGet('/reports/morbiditas'),
      safeGet('/reports/laba-rugi'),
    ]);

    return _ReportsData(
      visits: _asRows(results[0]),
      morbidity: _asRows(results[1]),
      profitLoss: results[2] is Map<String, dynamic>
          ? ProfitLossReport.fromJson(results[2] as Map<String, dynamic>)
          : ProfitLossReport.empty,
    );
  }

  /// Endpoint laporan mengembalikan daftar baris, kadang dibungkus objek.
  static List<Map<String, dynamic>> _asRows(dynamic payload) {
    if (payload is List) return asMapList(payload);
    if (payload is Map) {
      for (final key in const ['rows', 'items', 'data', 'report']) {
        final nested = payload[key];
        if (nested is List) return asMapList(nested);
      }
    }
    return const [];
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _pickRange() async {
    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: _range,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked == null) return;

    setState(() {
      _range = picked;
      _future = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<_ReportsData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorView(error: snapshot.error!, onRetry: _refresh);
          }

          final data = snapshot.data!;
          final profitLoss = data.profitLoss;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              OutlinedButton.icon(
                onPressed: _pickRange,
                icon: const Icon(Icons.date_range_outlined, size: 18),
                label: Text(
                  '${Formatters.date(_range.start)} – ${Formatters.date(_range.end)}',
                ),
              ),
              const SizedBox(height: 16),
              const SectionHeader(
                title: 'Ringkasan Keuangan',
                subtitle: 'Laba-rugi pada rentang tanggal terpilih',
              ),
              Row(
                children: [
                  Expanded(
                    child: StatCard(
                      label: 'Pendapatan',
                      value: Formatters.currency(profitLoss.totalRevenue),
                      icon: Icons.trending_up,
                      tone: AppTheme.success,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatCard(
                      label: 'Pengeluaran',
                      value: Formatters.currency(profitLoss.totalExpenses),
                      icon: Icons.trending_down,
                      tone: AppTheme.danger,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              StatCard(
                label: profitLoss.netProfit >= 0 ? 'Laba bersih' : 'Rugi bersih',
                value: Formatters.currency(profitLoss.netProfit.abs()),
                icon: Icons.account_balance_outlined,
                tone: profitLoss.netProfit >= 0
                    ? AppTheme.brandPrimary
                    : AppTheme.danger,
              ),
              if (profitLoss.expensesByCategory.isNotEmpty) ...[
                const SizedBox(height: 20),
                const SectionHeader(title: 'Pengeluaran per Kategori'),
                _CategoryBreakdown(
                  entries: profitLoss.expensesByCategory,
                  total: profitLoss.totalExpenses,
                ),
              ],
              const SizedBox(height: 24),
              const SectionHeader(
                title: 'Laporan Kunjungan',
                subtitle: 'Jumlah kunjungan per periode',
              ),
              _ReportTable(
                rows: data.visits,
                emptyMessage: 'Belum ada data kunjungan pada rentang ini.',
              ),
              const SizedBox(height: 24),
              const SectionHeader(
                title: 'Laporan Morbiditas',
                subtitle: 'Diagnosis terbanyak',
              ),
              _ReportTable(
                rows: data.morbidity,
                emptyMessage: 'Belum ada data morbiditas pada rentang ini.',
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ReportsData {
  const _ReportsData({
    required this.visits,
    required this.morbidity,
    required this.profitLoss,
  });

  final List<Map<String, dynamic>> visits;
  final List<Map<String, dynamic>> morbidity;
  final ProfitLossReport profitLoss;
}

class _CategoryBreakdown extends StatelessWidget {
  const _CategoryBreakdown({required this.entries, required this.total});

  final List<ExpenseByCategory> entries;
  final double total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            for (final entry in entries)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            Formatters.humanizeSlug(entry.category),
                            style: theme.textTheme.bodyMedium,
                          ),
                        ),
                        Text(
                          Formatters.currency(entry.total),
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        // Bagi-nol saat belum ada pengeluaran sama sekali.
                        value: total <= 0 ? 0 : (entry.total / total).clamp(0, 1),
                        minHeight: 6,
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Tabel generik untuk baris laporan yang bentuk kolomnya tidak tetap.
class _ReportTable extends StatelessWidget {
  const _ReportTable({required this.rows, required this.emptyMessage});

  final List<Map<String, dynamic>> rows;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (rows.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: Text(
              emptyMessage,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.outline),
            ),
          ),
        ),
      );
    }

    final columns = rows.first.keys.toList();

    return Card(
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 40,
          dataRowMinHeight: 40,
          dataRowMaxHeight: 52,
          columns: [
            for (final column in columns)
              DataColumn(
                label: Text(
                  Formatters.humanizeSlug(column),
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
          ],
          rows: [
            for (final row in rows)
              DataRow(
                cells: [
                  for (final column in columns)
                    DataCell(
                      Text(
                        _formatCell(row[column]),
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  /// Angka besar dirender sebagai angka berformat, sisanya sebagai teks.
  static String _formatCell(dynamic value) {
    if (value == null) return '-';
    if (value is num) return Formatters.number(value);
    if (value is List) return value.join(', ');
    if (value is Map) return '${value.length} field';
    return value.toString();
  }
}
