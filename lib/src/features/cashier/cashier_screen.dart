import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/report_models.dart';
import '../../shared/widgets/common_widgets.dart';
import '../modules/collection_screen.dart';
import '../modules/module_configs.dart';

/// Modul Kas (`/kas`): ringkasan kas harian, tutup kasir, dan pencatatan
/// pengeluaran operasional.
class CashierScreen extends ConsumerStatefulWidget {
  const CashierScreen({super.key});

  @override
  ConsumerState<CashierScreen> createState() => _CashierScreenState();
}

class _CashierScreenState extends ConsumerState<CashierScreen> {
  late Future<CashierDailySummary> _future;
  String _date = Formatters.todayIso();

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<CashierDailySummary> _load() async {
    final payload =
        await ref.read(collectionRepositoryProvider).get<Map<String, dynamic>>(
      '/cashier/summary',
      query: {'date': _date},
    );
    return CashierDailySummary.fromJson(payload);
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_date) ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked == null) return;

    setState(() {
      _date = Formatters.isoDate(picked);
      _future = _load();
    });
  }

  Future<void> _openCloseShiftDialog(CashierDailySummary summary) async {
    final closed = await showDialog<bool>(
      context: context,
      builder: (context) => _CloseShiftDialog(date: _date, summary: summary),
    );

    if (closed == true) {
      if (!mounted) return;
      showAppSnackBar(context, 'Kas berhasil ditutup.');
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Modul Kas menggabungkan ringkasan penutupan dengan daftar pengeluaran,
    // sehingga layar CRUD pengeluaran dipakai ulang dengan header khusus.
    return CollectionScreen(
      config: expensesConfig,
      header: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: FutureBuilder<CashierDailySummary>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              );
            }

            final summary = snapshot.hasError
                ? CashierDailySummary.empty
                : (snapshot.data ?? CashierDailySummary.empty);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OutlinedButton.icon(
                  onPressed: _pickDate,
                  icon: const Icon(Icons.calendar_today_outlined, size: 18),
                  label: Text(Formatters.dateLong(_date)),
                ),
                const SizedBox(height: 12),
                if (snapshot.hasError)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Ringkasan kas tidak dapat dimuat: ${snapshot.error}',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        label: 'Kas masuk (tunai)',
                        value: Formatters.currency(summary.systemCashTotal),
                        caption: '${summary.transactionCount} transaksi',
                        icon: Icons.payments_outlined,
                        tone: AppTheme.success,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: StatCard(
                        label: 'Pengeluaran tunai',
                        value: Formatters.currency(summary.cashExpenseTotal),
                        icon: Icons.money_off_outlined,
                        tone: AppTheme.danger,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        label: 'Kas seharusnya',
                        value: Formatters.currency(summary.expectedCashTotal),
                        icon: Icons.account_balance_wallet_outlined,
                        tone: AppTheme.brandPrimary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: StatCard(
                        label: 'Non-tunai',
                        value: Formatters.currency(summary.nonCashTotal),
                        icon: Icons.credit_card_outlined,
                        tone: AppTheme.info,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.tonalIcon(
                    onPressed: () => _openCloseShiftDialog(summary),
                    icon: const Icon(Icons.point_of_sale_outlined, size: 18),
                    label: const Text('Tutup Kas Harian'),
                  ),
                ),
                const SizedBox(height: 16),
                const SectionHeader(
                  title: 'Pengeluaran Operasional',
                  subtitle: 'Catat pengeluaran yang memengaruhi kas klinik',
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Dialog tutup kasir: membandingkan kas fisik dengan kas menurut sistem.
class _CloseShiftDialog extends ConsumerStatefulWidget {
  const _CloseShiftDialog({required this.date, required this.summary});

  final String date;
  final CashierDailySummary summary;

  @override
  ConsumerState<_CloseShiftDialog> createState() => _CloseShiftDialogState();
}

class _CloseShiftDialogState extends ConsumerState<_CloseShiftDialog> {
  final _formKey = GlobalKey<FormState>();
  final _cashierNameController = TextEditingController();
  final _openingBalanceController = TextEditingController(text: '0');
  final _countedCashController = TextEditingController();
  final _notesController = TextEditingController();

  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Nama kasir diisi otomatis dari pengguna yang sedang login.
    _cashierNameController.text =
        ref.read(authControllerProvider).user?.name ?? '';
  }

  @override
  void dispose() {
    _cashierNameController.dispose();
    _openingBalanceController.dispose();
    _countedCashController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  double get _countedCash =>
      double.tryParse(_countedCashController.text.trim()) ?? 0;

  double get _openingBalance =>
      double.tryParse(_openingBalanceController.text.trim()) ?? 0;

  /// Selisih terhadap kas yang seharusnya ada, termasuk saldo awal laci.
  double get _difference =>
      _countedCash - (widget.summary.expectedCashTotal + _openingBalance);

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      await ref.read(collectionRepositoryProvider).post<dynamic>(
        '/cashier/close',
        body: {
          'closingDate': widget.date,
          'cashierName': _cashierNameController.text.trim(),
          'openingBalance': _openingBalance,
          'countedCashTotal': _countedCash,
          if (_notesController.text.trim().isNotEmpty)
            'notes': _notesController.text.trim(),
        },
      );

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final difference = _difference;

    return AlertDialog(
      title: const Text('Tutup Kas Harian'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null) ...[
                Text(
                  _error!,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.error),
                ),
                const SizedBox(height: 12),
              ],
              Text(
                'Kas seharusnya: ${Formatters.currency(widget.summary.expectedCashTotal)}',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _cashierNameController,
                enabled: !_isSaving,
                decoration: const InputDecoration(labelText: 'Nama Kasir *'),
                validator: (value) => (value == null || value.trim().isEmpty)
                    ? 'Nama kasir wajib diisi'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _openingBalanceController,
                enabled: !_isSaving,
                keyboardType: TextInputType.number,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Saldo Awal Laci *',
                  prefixText: 'Rp ',
                ),
                validator: _validateAmount,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _countedCashController,
                enabled: !_isSaving,
                keyboardType: TextInputType.number,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Kas Fisik Dihitung *',
                  prefixText: 'Rp ',
                ),
                validator: _validateAmount,
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (difference == 0 ? AppTheme.success : AppTheme.warning)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('Selisih', style: theme.textTheme.bodySmall),
                    ),
                    Text(
                      Formatters.currency(difference),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: difference == 0
                            ? AppTheme.success
                            : AppTheme.warning,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesController,
                enabled: !_isSaving,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Catatan'),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSaving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Batal'),
        ),
        FilledButton(
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
              : const Text('Tutup Kas'),
        ),
      ],
    );
  }

  /// Backend memvalidasi `isFloat({ min: 0 })` untuk kedua nominal.
  static String? _validateAmount(String? value) {
    final amount = double.tryParse((value ?? '').trim());
    if (amount == null) return 'Masukkan nominal yang valid';
    if (amount < 0) return 'Nominal tidak boleh negatif';
    return null;
  }
}
