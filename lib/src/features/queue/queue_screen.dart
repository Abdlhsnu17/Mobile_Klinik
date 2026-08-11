import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/clinic_models.dart';
import '../../shared/widgets/common_widgets.dart';
import '../../shared/widgets/status_badge.dart';
import 'queue_register_sheet.dart';

/// Modul Pendaftaran & Antrian (`/antrian`).
///
/// Port dari `apps/frontend/app/antrian/page.tsx`: mendaftarkan kunjungan baru
/// dan menggerakkan status antrian lewat endpoint alur kerja backend
/// (`/workflows/visits/...`) agar nomor antrian dan rekam medis dibuat server.
class QueueScreen extends ConsumerStatefulWidget {
  const QueueScreen({super.key});

  @override
  ConsumerState<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends ConsumerState<QueueScreen> {
  late Future<List<Appointment>> _future;
  String _selectedDate = Formatters.todayIso();
  AppointmentStatus? _statusFilter;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Appointment>> _load() async {
    final records =
        await ref.read(collectionRepositoryProvider).list('appointments');
    return records.map(Appointment.fromJson).toList();
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  /// Menjalankan transisi status lewat endpoint alur kerja.
  Future<void> _runWorkflow(
    Appointment appointment,
    String action,
    String successMessage,
  ) async {
    try {
      await ref.read(collectionRepositoryProvider).post<dynamic>(
            '/workflows/visits/${appointment.id}/$action',
          );
      if (!mounted) return;
      showAppSnackBar(context, successMessage);
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  /// Pembatalan tidak punya endpoint alur kerja khusus, jadi status diubah
  /// langsung lewat koleksi appointments.
  Future<void> _cancelVisit(Appointment appointment) async {
    final confirmed = await confirmAction(
      context,
      title: 'Batalkan kunjungan?',
      message:
          'Antrian ${appointment.patientName} akan ditandai batal dan tidak dapat dilanjutkan.',
      confirmLabel: 'Batalkan',
    );
    if (!confirmed) return;

    try {
      await ref.read(collectionRepositoryProvider).update(
        'appointments',
        appointment.id,
        {'status': AppointmentStatus.batal.value},
      );
      if (!mounted) return;
      showAppSnackBar(context, 'Kunjungan dibatalkan.');
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  Future<void> _openRegisterSheet() async {
    final registered = await showQueueRegisterSheet(context, ref);
    if (registered) await _refresh();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_selectedDate) ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _selectedDate = Formatters.isoDate(picked));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openRegisterSheet,
        icon: const Icon(Icons.add),
        label: const Text('Daftar Kunjungan'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Appointment>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ErrorView(error: snapshot.error!, onRetry: _refresh);
            }

            final all = snapshot.data ?? const <Appointment>[];
            final forDate = all
                .where((item) => item.date.startsWith(_selectedDate))
                .toList()
              ..sort((a, b) => a.queueNumber.compareTo(b.queueNumber));
            final visible = _statusFilter == null
                ? forDate
                : forDate.where((item) => item.status == _statusFilter).toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                _DateSelector(
                  selectedDate: _selectedDate,
                  onPickDate: _pickDate,
                  onToday: () =>
                      setState(() => _selectedDate = Formatters.todayIso()),
                ),
                const SizedBox(height: 14),
                _QueueSummary(appointments: forDate),
                const SizedBox(height: 14),
                _StatusFilterBar(
                  selected: _statusFilter,
                  counts: {
                    for (final status in AppointmentStatus.values)
                      status:
                          forDate.where((item) => item.status == status).length,
                  },
                  onSelected: (status) =>
                      setState(() => _statusFilter = status),
                ),
                const SizedBox(height: 14),
                if (visible.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: EmptyState(
                      icon: Icons.event_busy_outlined,
                      title: 'Belum ada antrian',
                      message:
                          'Daftarkan kunjungan pasien untuk membuat nomor antrian pada tanggal ini.',
                    ),
                  )
                else
                  for (final appointment in visible)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _QueueCard(
                        appointment: appointment,
                        onStartExam: () => _runWorkflow(
                          appointment,
                          'start-exam',
                          'Pemeriksaan dimulai untuk ${appointment.patientName}.',
                        ),
                        onFinishExam: () => _runWorkflow(
                          appointment,
                          'finish-exam',
                          'Pemeriksaan ${appointment.patientName} diselesaikan.',
                        ),
                        onCancel: () => _cancelVisit(appointment),
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

class _DateSelector extends StatelessWidget {
  const _DateSelector({
    required this.selectedDate,
    required this.onPickDate,
    required this.onToday,
  });

  final String selectedDate;
  final VoidCallback onPickDate;
  final VoidCallback onToday;

  @override
  Widget build(BuildContext context) {
    final isToday = selectedDate == Formatters.todayIso();

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onPickDate,
            icon: const Icon(Icons.calendar_today_outlined, size: 18),
            label: Text(Formatters.dateLong(selectedDate)),
          ),
        ),
        if (!isToday) ...[
          const SizedBox(width: 10),
          TextButton(onPressed: onToday, child: const Text('Hari ini')),
        ],
      ],
    );
  }
}

class _QueueSummary extends StatelessWidget {
  const _QueueSummary({required this.appointments});

  final List<Appointment> appointments;

  @override
  Widget build(BuildContext context) {
    int countOf(AppointmentStatus status) =>
        appointments.where((item) => item.status == status).length;

    return Row(
      children: [
        Expanded(
          child: StatCard(
            label: 'Total antrian',
            value: Formatters.number(appointments.length),
            icon: Icons.confirmation_number_outlined,
            tone: AppTheme.brandPrimary,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: StatCard(
            label: 'Menunggu',
            value: Formatters.number(countOf(AppointmentStatus.menunggu)),
            icon: Icons.hourglass_empty,
            tone: AppTheme.warning,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: StatCard(
            label: 'Selesai',
            value: Formatters.number(countOf(AppointmentStatus.selesai)),
            icon: Icons.check_circle_outline,
            tone: AppTheme.success,
          ),
        ),
      ],
    );
  }
}

class _StatusFilterBar extends StatelessWidget {
  const _StatusFilterBar({
    required this.selected,
    required this.counts,
    required this.onSelected,
  });

  final AppointmentStatus? selected;
  final Map<AppointmentStatus, int> counts;
  final ValueChanged<AppointmentStatus?> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: const Text('Semua', style: TextStyle(fontSize: 12)),
              selected: selected == null,
              onSelected: (_) => onSelected(null),
            ),
          ),
          for (final status in AppointmentStatus.values)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(
                  '${status.label} (${counts[status] ?? 0})',
                  style: const TextStyle(fontSize: 12),
                ),
                selected: selected == status,
                onSelected: (_) =>
                    onSelected(selected == status ? null : status),
              ),
            ),
        ],
      ),
    );
  }
}

class _QueueCard extends StatelessWidget {
  const _QueueCard({
    required this.appointment,
    required this.onStartExam,
    required this.onFinishExam,
    required this.onCancel,
  });

  final Appointment appointment;
  final VoidCallback onStartExam;
  final VoidCallback onFinishExam;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = appointment.status;

    // Alur antrian: Menunggu/Dipanggil -> mulai periksa -> Diperiksa ->
    // selesaikan -> Selesai. Status akhir tidak menampilkan aksi apa pun.
    final canStart = status == AppointmentStatus.menunggu ||
        status == AppointmentStatus.dipanggil;
    final canFinish = status == AppointmentStatus.diperiksa;
    final isClosed = status == AppointmentStatus.selesai ||
        status == AppointmentStatus.batal;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _QueueNumberBadge(number: appointment.queueNumber),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        appointment.patientName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        appointment.doctorName.isEmpty
                            ? 'Dokter belum ditentukan'
                            : appointment.doctorName,
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: theme.colorScheme.outline),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status.value),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _Pill(icon: Icons.schedule, label: appointment.time),
                for (final service in appointment.displayServices)
                  _Pill(icon: Icons.medical_information_outlined, label: service),
                if (appointment.hasTriage)
                  const _Pill(
                    icon: Icons.monitor_heart_outlined,
                    label: 'Triase tercatat',
                  ),
              ],
            ),
            if (!isClosed) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: onCancel,
                    style: TextButton.styleFrom(
                      foregroundColor: theme.colorScheme.error,
                    ),
                    child: const Text('Batalkan'),
                  ),
                  const SizedBox(width: 8),
                  if (canStart)
                    FilledButton.tonalIcon(
                      onPressed: onStartExam,
                      icon: const Icon(Icons.play_arrow, size: 18),
                      label: const Text('Mulai Periksa'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 38),
                      ),
                    ),
                  if (canFinish)
                    FilledButton.icon(
                      onPressed: onFinishExam,
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('Selesaikan'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 38),
                      ),
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

class _QueueNumberBadge extends StatelessWidget {
  const _QueueNumberBadge({required this.number});

  final int number;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppTheme.brandPrimary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        number > 0 ? '$number' : '-',
        style: const TextStyle(
          color: AppTheme.brandPrimary,
          fontWeight: FontWeight.w700,
          fontSize: 16,
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: theme.colorScheme.outline),
          const SizedBox(width: 4),
          Text(label, style: theme.textTheme.labelSmall),
        ],
      ),
    );
  }
}
