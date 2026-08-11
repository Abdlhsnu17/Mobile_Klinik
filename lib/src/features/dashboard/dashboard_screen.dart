import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/access/module_registry.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../models/clinic_models.dart';
import '../../models/report_models.dart';
import '../../shared/widgets/common_widgets.dart';

/// Ringkasan aktivitas klinik dan peluncur modul.
///
/// Port dari `apps/frontend/app/dashboard/page.tsx`, memuat indikator harian
/// dari beberapa koleksi sekaligus.
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  late Future<_DashboardData> _future;

  @override
  void initState() {
    super.initState();
    _future = _loadDashboard();
  }

  /// Memuat indikator dashboard.
  ///
  /// Setiap sumber dibungkus agar kegagalan satu koleksi (mis. peran tanpa
  /// akses baca) tidak mengosongkan seluruh dashboard.
  Future<_DashboardData> _loadDashboard() async {
    final repository = ref.read(collectionRepositoryProvider);

    Future<List<Map<String, dynamic>>> safeList(String path) async {
      try {
        return await repository.list(path);
      } catch (_) {
        return const [];
      }
    }

    Future<OperationalAlertsResponse> safeAlerts() async {
      try {
        final payload = await repository.get<Map<String, dynamic>>('/alerts');
        return OperationalAlertsResponse.fromJson(payload);
      } catch (_) {
        return OperationalAlertsResponse.empty;
      }
    }

    final results = await Future.wait([
      safeList('appointments'),
      safeList('patients'),
      safeList('doctors'),
      safeList('medicines'),
    ]);
    final alerts = await safeAlerts();

    final appointments =
        results[0].map(Appointment.fromJson).toList(growable: false);
    final today = Formatters.todayIso();
    final todaysQueue = appointments
        .where((appointment) => appointment.date.startsWith(today))
        .toList();

    return _DashboardData(
      todaysQueue: todaysQueue,
      totalPatients: results[1].length,
      activeDoctors: results[2]
          .map(Doctor.fromJson)
          .where((doctor) => doctor.isActive)
          .length,
      lowStockMedicines: results[3]
          .map(Medicine.fromJson)
          .where((medicine) => medicine.isLowStock || medicine.isOutOfStock)
          .length,
      alerts: alerts,
    );
  }

  Future<void> _refresh() async {
    setState(() => _future = _loadDashboard());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final allowedHrefs = ref.watch(allowedModuleHrefsProvider);
    final sections =
        allowedModuleSections(user?.role, allowedHrefs: allowedHrefs);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          _WelcomeCard(name: user?.name ?? '-', roleLabel: user?.role.label ?? '-'),
          const SizedBox(height: 20),
          FutureBuilder<_DashboardData>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator()),
                );
              }

              if (snapshot.hasError) {
                return ErrorView(error: snapshot.error!, onRetry: _refresh);
              }

              return _StatsGrid(data: snapshot.data!);
            },
          ),
          const SizedBox(height: 24),
          const SectionHeader(
            title: 'Modul Aplikasi',
            subtitle: 'Modul yang dapat Anda akses sesuai peran',
          ),
          for (final section in sections) ...[
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 8),
              child: Text(
                section.label,
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 190,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.55,
              ),
              itemCount: section.items.length,
              itemBuilder: (context, index) =>
                  _ModuleTile(item: section.items[index]),
            ),
          ],
        ],
      ),
    );
  }
}

/// Indikator yang ditampilkan di kartu ringkasan dashboard.
class _DashboardData {
  const _DashboardData({
    required this.todaysQueue,
    required this.totalPatients,
    required this.activeDoctors,
    required this.lowStockMedicines,
    required this.alerts,
  });

  final List<Appointment> todaysQueue;
  final int totalPatients;
  final int activeDoctors;
  final int lowStockMedicines;
  final OperationalAlertsResponse alerts;

  int get waitingCount => todaysQueue
      .where((appointment) => appointment.status == AppointmentStatus.menunggu)
      .length;

  int get completedCount => todaysQueue
      .where((appointment) => appointment.status == AppointmentStatus.selesai)
      .length;
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.name, required this.roleLabel});

  final String name;
  final String roleLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppTheme.brandGradient,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Selamat datang, $name',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$roleLabel · ${Formatters.dateLong(DateTime.now())}',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.data});

  final _DashboardData data;

  @override
  Widget build(BuildContext context) {
    final summary = data.alerts.summary;

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      mainAxisExtent: 160,
      children: [
        StatCard(
          label: 'Antrian hari ini',
          value: Formatters.number(data.todaysQueue.length),
          caption: '${data.waitingCount} menunggu',
          icon: Icons.event_note_outlined,
          tone: AppTheme.info,
          onTap: () => context.go('/antrian'),
        ),
        StatCard(
          label: 'Kunjungan selesai',
          value: Formatters.number(data.completedCount),
          caption: 'dari ${data.todaysQueue.length} kunjungan',
          icon: Icons.check_circle_outline,
          tone: AppTheme.success,
        ),
        StatCard(
          label: 'Total pasien',
          value: Formatters.number(data.totalPatients),
          caption: '${data.activeDoctors} dokter aktif',
          icon: Icons.groups_outlined,
          tone: AppTheme.brandPrimary,
          onTap: () => context.go('/pasien'),
        ),
        StatCard(
          label: 'Peringatan aktif',
          value: Formatters.number(summary.total),
          caption: summary.critical > 0
              ? '${summary.critical} kritis'
              : '${data.lowStockMedicines} obat menipis',
          icon: Icons.notifications_active_outlined,
          tone: summary.critical > 0 ? AppTheme.danger : AppTheme.warning,
          onTap: () => context.go('/peringatan'),
        ),
      ],
    );
  }
}

class _ModuleTile extends StatelessWidget {
  const _ModuleTile({required this.item});

  final ModuleItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go(item.href),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: item.tone.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(item.icon, size: 18, color: item.tone),
              ),
              const Spacer(),
              Text(
                item.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 2),
              Text(
                item.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall
                    ?.copyWith(color: theme.colorScheme.outline),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
