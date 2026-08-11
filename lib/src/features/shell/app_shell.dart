import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/access/module_registry.dart';
import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/common_widgets.dart';

/// Kerangka aplikasi setelah login: app bar dengan identitas modul aktif dan
/// laci navigasi berisi modul yang boleh diakses peran pengguna.
///
/// Menggantikan `components/sidebar.tsx` + `components/header.tsx` di frontend
/// Next.js, disesuaikan untuk layar sentuh.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final module = moduleByHref[location];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(module?.title ?? AppConfig.appName),
            if (module != null)
              Text(
                AppConfig.appName,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context).colorScheme.outline,
                    ),
              ),
          ],
        ),
        actions: const [_ProfileMenuButton()],
      ),
      drawer: const _AppDrawer(),
      body: child,
    );
  }
}

class _AppDrawer extends ConsumerWidget {
  const _AppDrawer();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final allowedHrefs = ref.watch(allowedModuleHrefsProvider);
    final sections =
        allowedModuleSections(auth.role, allowedHrefs: allowedHrefs);
    final currentLocation = GoRouterState.of(context).matchedLocation;

    return Drawer(
      child: Column(
        children: [
          const _DrawerHeader(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.only(bottom: 16),
              children: [
                for (final section in sections) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
                    child: Text(
                      section.label.toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Theme.of(context).colorScheme.outline,
                            letterSpacing: 1.1,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  for (final item in section.items)
                    _DrawerItem(
                      item: item,
                      isActive: currentLocation == item.href,
                    ),
                ],
              ],
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout, color: AppTheme.danger),
            title: const Text(
              'Keluar',
              style: TextStyle(color: AppTheme.danger),
            ),
            onTap: () => _confirmLogout(context, ref),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
  final confirmed = await confirmAction(
    context,
    title: 'Keluar dari aplikasi?',
    message: 'Anda perlu login kembali untuk mengakses data klinik.',
    confirmLabel: 'Keluar',
  );

  if (!confirmed || !context.mounted) return;
  await ref.read(authControllerProvider.notifier).logout();
}

class _DrawerHeader extends ConsumerWidget {
  const _DrawerHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 56, 20, 20),
      decoration: const BoxDecoration(gradient: AppTheme.brandGradient),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _UserAvatar(radius: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.name ?? AppConfig.appName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user?.role.label ?? '-',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  const _DrawerItem({required this.item, required this.isActive});

  final ModuleItem item;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 1),
      child: ListTile(
        dense: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        selected: isActive,
        selectedTileColor: item.tone.withValues(alpha: 0.12),
        leading: Icon(
          item.icon,
          size: 20,
          color: isActive ? item.tone : theme.colorScheme.outline,
        ),
        title: Text(
          item.navTitle,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
            color: isActive ? item.tone : theme.colorScheme.onSurface,
          ),
        ),
        onTap: () {
          Navigator.of(context).pop();
          if (!isActive) context.go(item.href);
        },
      ),
    );
  }
}

/// Avatar pengguna dengan fallback inisial saat foto belum diunggah.
class _UserAvatar extends ConsumerWidget {
  const _UserAvatar({this.radius = 18});

  final double radius;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final avatarUrl = AppConfig.resolveMediaUrl(user?.avatarUrl);

    return CircleAvatar(
      radius: radius,
      backgroundColor: Colors.white,
      foregroundImage: avatarUrl == null ? null : NetworkImage(avatarUrl),
      child: Text(
        user?.initials ?? '?',
        style: TextStyle(
          color: AppTheme.brandPrimary,
          fontWeight: FontWeight.w700,
          fontSize: radius * 0.7,
        ),
      ),
    );
  }
}

/// Menu profil di app bar: pintasan pengaturan dan keluar.
class _ProfileMenuButton extends ConsumerWidget {
  const _ProfileMenuButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;

    return PopupMenuButton<String>(
      tooltip: 'Menu pengguna',
      offset: const Offset(0, 48),
      icon: const Padding(
        padding: EdgeInsets.only(right: 4),
        child: _UserAvatar(),
      ),
      onSelected: (value) async {
        switch (value) {
          case 'pengaturan':
            context.go('/pengaturan');
          case 'keluar':
            await _confirmLogout(context, ref);
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem<String>(
          enabled: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                user?.name ?? '-',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              Text(
                '${user?.username ?? '-'} · ${user?.role.label ?? '-'}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem<String>(
          value: 'pengaturan',
          child: ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.settings_outlined, size: 20),
            title: Text('Pengaturan'),
          ),
        ),
        const PopupMenuItem<String>(
          value: 'keluar',
          child: ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.logout, size: 20, color: AppTheme.danger),
            title: Text('Keluar', style: TextStyle(color: AppTheme.danger)),
          ),
        ),
      ],
    );
  }
}
