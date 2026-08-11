import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/utils/formatters.dart';
import '../../models/clinic_models.dart';
import '../../shared/widgets/common_widgets.dart';

/// Formulir pendaftaran kunjungan.
///
/// Mengirim ke `POST /workflows/visits/register` agar backend yang menentukan
/// nomor antrian dan menyiapkan rekam medis, bukan dihitung di klien.
class QueueRegisterSheet extends ConsumerStatefulWidget {
  const QueueRegisterSheet({super.key});

  @override
  ConsumerState<QueueRegisterSheet> createState() => _QueueRegisterSheetState();
}

class _QueueRegisterSheetState extends ConsumerState<QueueRegisterSheet> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();

  late Future<_RegisterOptions> _optionsFuture;

  Patient? _patient;
  Doctor? _doctor;
  final Set<String> _selectedServiceIds = {};
  DateTime _date = DateTime.now();
  TimeOfDay _time = TimeOfDay.now();

  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _optionsFuture = _loadOptions();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<_RegisterOptions> _loadOptions() async {
    final repository = ref.read(collectionRepositoryProvider);
    final results = await Future.wait([
      repository.list('patients'),
      repository.list('doctors'),
      repository.list('services'),
    ]);

    return _RegisterOptions(
      patients: results[0].map(Patient.fromJson).toList(),
      // Hanya dokter dan layanan aktif yang boleh dipilih untuk kunjungan baru.
      doctors: results[1]
          .map(Doctor.fromJson)
          .where((doctor) => doctor.isActive)
          .toList(),
      services: results[2]
          .map(ClinicService.fromJson)
          .where((service) => service.isActive)
          .toList(),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_patient == null) {
      setState(() => _error = 'Pilih pasien terlebih dahulu.');
      return;
    }
    if (_selectedServiceIds.isEmpty) {
      setState(() => _error = 'Pilih minimal satu layanan.');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    final hour = _time.hour.toString().padLeft(2, '0');
    final minute = _time.minute.toString().padLeft(2, '0');

    try {
      await ref.read(collectionRepositoryProvider).post<dynamic>(
        '/workflows/visits/register',
        body: {
          'patientId': _patient!.id,
          if (_doctor != null) 'doctorId': _doctor!.id,
          'date': Formatters.isoDate(_date),
          'time': '$hour:$minute',
          'serviceIds': _selectedServiceIds.toList(),
          // `serviceId` tetap dikirim demi kompatibilitas dengan data lama
          // yang hanya menyimpan satu layanan per kunjungan.
          'serviceId': _selectedServiceIds.first,
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
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.92,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Daftar Kunjungan',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: FutureBuilder<_RegisterOptions>(
                future: _optionsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return ErrorView(error: snapshot.error!);
                  }

                  return _buildForm(scrollController, snapshot.data!);
                },
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
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
                      : const Text('Daftarkan Kunjungan'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildForm(ScrollController controller, _RegisterOptions options) {
    // Layanan disaring mengikuti spesialisasi dokter yang dipilih, seperti
    // perilaku `doctor-select` + `patient-combobox` di frontend Next.js.
    final services = options.services
        .where((service) => service.matchesSpecialization(_doctor?.specialization))
        .toList();

    return Form(
      key: _formKey,
      child: ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        children: [
          if (_error != null) ...[
            _ErrorBox(message: _error!),
            const SizedBox(height: 14),
          ],
          DropdownButtonFormField<Patient>(
            initialValue: _patient,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Pasien *',
              prefixIcon: Icon(Icons.person_outline),
            ),
            items: [
              for (final patient in options.patients)
                DropdownMenuItem(
                  value: patient,
                  child: Text(
                    '${patient.name} · ${patient.noRM}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: _isSaving
                ? null
                : (value) => setState(() => _patient = value),
            validator: (value) => value == null ? 'Pasien wajib dipilih' : null,
          ),
          if (_patient?.hasAllergy ?? false) ...[
            const SizedBox(height: 8),
            _AllergyWarning(allergies: _patient!.allergies!),
          ],
          const SizedBox(height: 14),
          DropdownButtonFormField<Doctor>(
            initialValue: _doctor,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Dokter',
              prefixIcon: Icon(Icons.medical_services_outlined),
              helperText: 'Kosongkan bila dokter ditentukan kemudian',
            ),
            items: [
              for (final doctor in options.doctors)
                DropdownMenuItem(
                  value: doctor,
                  child: Text(
                    '${doctor.name} · ${doctor.specialization}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: _isSaving
                ? null
                : (value) => setState(() {
                      _doctor = value;
                      // Layanan yang tidak lagi cocok dengan spesialisasi baru
                      // harus dilepas agar tidak terkirim diam-diam.
                      _selectedServiceIds.removeWhere((id) {
                        final service = options.services
                            .where((item) => item.id == id)
                            .firstOrNull;
                        return service != null &&
                            !service.matchesSpecialization(value?.specialization);
                      });
                    }),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isSaving ? null : _pickDate,
                  icon: const Icon(Icons.calendar_today_outlined, size: 18),
                  label: Text(Formatters.date(_date)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isSaving ? null : _pickTime,
                  icon: const Icon(Icons.schedule, size: 18),
                  label: Text(_time.format(context)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            'Layanan *',
            style: Theme.of(context)
                .textTheme
                .labelLarge
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          if (services.isEmpty)
            Text(
              'Tidak ada layanan aktif yang cocok dengan spesialisasi dokter ini.',
              style: Theme.of(context).textTheme.bodySmall,
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final service in services)
                  FilterChip(
                    label: Text(
                      '${service.name} · ${Formatters.currency(service.price)}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    selected: _selectedServiceIds.contains(service.id),
                    onSelected: _isSaving
                        ? null
                        : (selected) => setState(() {
                              if (selected) {
                                _selectedServiceIds.add(service.id);
                              } else {
                                _selectedServiceIds.remove(service.id);
                              }
                            }),
                  ),
              ],
            ),
          if (_selectedServiceIds.isNotEmpty) ...[
            const SizedBox(height: 10),
            _EstimatedTotal(
              services: services
                  .where((service) => _selectedServiceIds.contains(service.id))
                  .toList(),
            ),
          ],
          const SizedBox(height: 16),
          TextFormField(
            controller: _notesController,
            enabled: !_isSaving,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Catatan',
              alignLabelWithHint: true,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) setState(() => _time = picked);
  }
}

class _RegisterOptions {
  const _RegisterOptions({
    required this.patients,
    required this.doctors,
    required this.services,
  });

  final List<Patient> patients;
  final List<Doctor> doctors;
  final List<ClinicService> services;
}

class _AllergyWarning extends StatelessWidget {
  const _AllergyWarning({required this.allergies});

  final String allergies;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded,
              size: 18, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Riwayat alergi: $allergies',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

class _EstimatedTotal extends StatelessWidget {
  const _EstimatedTotal({required this.services});

  final List<ClinicService> services;

  @override
  Widget build(BuildContext context) {
    final total = services.fold<double>(0, (sum, item) => sum + item.price);
    final duration = services.fold<int>(0, (sum, item) => sum + item.duration);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHighest
            .withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '${services.length} layanan · estimasi $duration menit',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Text(
            Formatters.currency(total),
            style: Theme.of(context)
                .textTheme
                .titleSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});

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

/// Membuka formulir pendaftaran; mengembalikan true bila kunjungan tersimpan.
Future<bool> showQueueRegisterSheet(BuildContext context, WidgetRef ref) async {
  final registered = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => const QueueRegisterSheet(),
  );

  if (registered == true && context.mounted) {
    showAppSnackBar(context, 'Kunjungan berhasil didaftarkan.');
  }

  return registered ?? false;
}
