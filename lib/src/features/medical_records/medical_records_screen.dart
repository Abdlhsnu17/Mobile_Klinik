import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/clinic_models.dart';
import '../../shared/widgets/common_widgets.dart';
import '../../shared/widgets/status_badge.dart';

/// Modul Pemeriksaan (`/pemeriksaan`).
///
/// Menampilkan rekam medis beserta SOAP, tanda vital, dan resep. Rekam medis
/// yang sudah difinalisasi dikunci server (`status: locked`) dan tidak lagi
/// dapat diubah, sesuai kaidah kepatuhan rekam medis.
class MedicalRecordsScreen extends ConsumerStatefulWidget {
  const MedicalRecordsScreen({super.key});

  @override
  ConsumerState<MedicalRecordsScreen> createState() =>
      _MedicalRecordsScreenState();
}

class _MedicalRecordsScreenState extends ConsumerState<MedicalRecordsScreen> {
  final _searchController = TextEditingController();

  late Future<_RecordsData> _future;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<_RecordsData> _load() async {
    final repository = ref.read(collectionRepositoryProvider);
    final results = await Future.wait([
      repository.list('medical-records'),
      repository.list('patients'),
    ]);

    return _RecordsData(
      records: results[0].map(MedicalRecord.fromJson).toList(),
      // Rekam medis hanya menyimpan patientId, jadi nama pasien dipetakan di
      // klien agar daftar tetap terbaca.
      patientNames: {
        for (final patient in results[1].map(Patient.fromJson))
          patient.id: patient.name,
      },
    );
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  /// Mengunci rekam medis lewat endpoint finalisasi.
  Future<void> _finalize(MedicalRecord record) async {
    final confirmed = await confirmAction(
      context,
      title: 'Finalisasi rekam medis?',
      message:
          'Setelah difinalisasi, rekam medis dikunci dan tidak dapat diubah lagi.',
      confirmLabel: 'Finalisasi',
      isDestructive: false,
    );
    if (!confirmed) return;

    try {
      await ref.read(collectionRepositoryProvider).post<dynamic>(
            '/workflows/medical-records/${record.id}/finalize',
          );
      if (!mounted) return;
      showAppSnackBar(context, 'Rekam medis berhasil difinalisasi.');
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<_RecordsData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorView(error: snapshot.error!, onRetry: _refresh);
          }

          final data = snapshot.data!;
          final visible = data.records.where((record) {
            final needle = _query.trim().toLowerCase();
            if (needle.isEmpty) return true;

            final patientName = data.patientNames[record.patientId] ?? '';
            return patientName.toLowerCase().contains(needle) ||
                record.diagnosis.toLowerCase().contains(needle) ||
                record.doctorName.toLowerCase().contains(needle);
          }).toList()
            ..sort((a, b) => b.date.compareTo(a.date));

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              SearchField(
                controller: _searchController,
                hintText: 'Cari pasien, diagnosis, atau dokter...',
                onChanged: (value) => setState(() => _query = value),
              ),
              const SizedBox(height: 8),
              Text(
                '${visible.length} dari ${data.records.length} rekam medis',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context).colorScheme.outline,
                    ),
              ),
              const SizedBox(height: 12),
              if (visible.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 40),
                  child: EmptyState(
                    icon: Icons.description_outlined,
                    title: 'Belum ada rekam medis',
                    message:
                        'Rekam medis dibuat otomatis ketika pemeriksaan kunjungan dimulai dari modul Pendaftaran.',
                  ),
                )
              else
                for (final record in visible)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _MedicalRecordCard(
                      record: record,
                      patientName:
                          data.patientNames[record.patientId] ?? record.patientId,
                      onFinalize:
                          record.isLocked ? null : () => _finalize(record),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _RecordsData {
  const _RecordsData({required this.records, required this.patientNames});

  final List<MedicalRecord> records;
  final Map<String, String> patientNames;
}

class _MedicalRecordCard extends StatelessWidget {
  const _MedicalRecordCard({
    required this.record,
    required this.patientName,
    this.onFinalize,
  });

  final MedicalRecord record;
  final String patientName;
  final VoidCallback? onFinalize;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                          patientName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${record.doctorName.isEmpty ? 'Dokter tidak tercatat' : record.doctorName} · ${Formatters.date(record.date)}',
                          style: theme.textTheme.bodySmall
                              ?.copyWith(color: theme.colorScheme.outline),
                        ),
                      ],
                    ),
                  ),
                  if (record.status != null) StatusBadge(record.status),
                ],
              ),
              const SizedBox(height: 10),
              _LabeledText(
                label: 'Diagnosis',
                value: record.diagnosis.isEmpty ? '-' : record.diagnosis,
              ),
              if (record.treatment.isNotEmpty)
                _LabeledText(label: 'Tindakan', value: record.treatment),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (record.prescription.isNotEmpty)
                    _Chip(
                      icon: Icons.medication_outlined,
                      label: '${record.prescription.length} item resep',
                    ),
                  if (!(record.vitalSigns?.isEmpty ?? true))
                    const _Chip(
                      icon: Icons.monitor_heart_outlined,
                      label: 'Tanda vital',
                    ),
                  if (record.clinicalDecision != null)
                    _Chip(
                      icon: Icons.route_outlined,
                      label: Formatters.humanizeSlug(record.clinicalDecision),
                    ),
                  if (record.isLocked)
                    const _Chip(icon: Icons.lock_outline, label: 'Terkunci'),
                ],
              ),
              if (onFinalize != null) ...[
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton.tonalIcon(
                    onPressed: onFinalize,
                    icon: const Icon(Icons.lock_outline, size: 16),
                    label: const Text('Finalisasi'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 36),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    final soap = record.soap;
    final vitals = record.vitalSigns;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.8,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            Text(
              patientName,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              '${record.doctorName} · ${Formatters.dateLong(record.date)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const Divider(height: 28),
            DetailRow(label: 'Diagnosis', value: record.diagnosis),
            DetailRow(label: 'Keluhan', value: record.symptoms),
            DetailRow(label: 'Tindakan', value: record.treatment),
            if (record.clinicalDecision != null)
              DetailRow(
                label: 'Keputusan Klinis',
                value: Formatters.humanizeSlug(record.clinicalDecision),
              ),
            if (soap != null) ...[
              const SizedBox(height: 12),
              const _SheetSectionTitle('Catatan SOAP'),
              DetailRow(label: 'Subjective', value: soap.subjective ?? '-'),
              DetailRow(label: 'Objective', value: soap.objective ?? '-'),
              DetailRow(label: 'Assessment', value: soap.assessment ?? '-'),
              DetailRow(label: 'Plan', value: soap.plan ?? '-'),
            ],
            if (vitals != null && !vitals.isEmpty) ...[
              const SizedBox(height: 12),
              const _SheetSectionTitle('Tanda Vital'),
              DetailRow(
                label: 'Tekanan Darah',
                value: vitals.bloodPressure ?? '-',
              ),
              DetailRow(label: 'Nadi', value: vitals.heartRate ?? '-'),
              DetailRow(label: 'Suhu', value: vitals.temperature ?? '-'),
              DetailRow(
                label: 'Saturasi O₂',
                value: vitals.oxygenSaturation ?? '-',
              ),
              DetailRow(label: 'Berat Badan', value: vitals.weight ?? '-'),
              DetailRow(label: 'Tinggi Badan', value: vitals.height ?? '-'),
            ],
            if (record.prescription.isNotEmpty) ...[
              const SizedBox(height: 12),
              const _SheetSectionTitle('Resep'),
              for (final item in record.prescription)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.medication_outlined, size: 20),
                  title: Text(item.medicineName),
                  subtitle: Text(
                    '${item.dosage} · ${item.frequency} · ${item.duration} · ${item.quantity} unit',
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SheetSectionTitle extends StatelessWidget {
  const _SheetSectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 4),
        child: Text(
          title,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppTheme.brandPrimary,
              ),
        ),
      );
}

class _LabeledText extends StatelessWidget {
  const _LabeledText({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        text: TextSpan(
          style: theme.textTheme.bodySmall,
          children: [
            TextSpan(
              text: '$label: ',
              style: TextStyle(color: theme.colorScheme.outline),
            ),
            TextSpan(
              text: value,
              style: TextStyle(color: theme.colorScheme.onSurface),
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label});

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
