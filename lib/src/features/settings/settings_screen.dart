import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/access/module_registry.dart';
import '../../core/access/role_access.dart';
import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../models/user.dart';
import '../../shared/widgets/common_widgets.dart';

/// Modul Pengaturan (`/pengaturan`): profil pengguna, tema, hak akses peran,
/// dan informasi aplikasi. Port dari `apps/frontend/app/pengaturan/page.tsx`.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        const SectionHeader(title: 'Profil Pengguna'),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor:
                          AppTheme.brandPrimary.withValues(alpha: 0.12),
                      foregroundImage: switch (
                          AppConfig.resolveMediaUrl(user?.avatarUrl)) {
                        final url? => NetworkImage(url),
                        null => null,
                      },
                      child: Text(
                        user?.initials ?? '?',
                        style: const TextStyle(
                          color: AppTheme.brandPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.name ?? '-',
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          Text(
                            user?.email ?? '-',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                DetailRow(label: 'Username', value: user?.username ?? '-'),
                DetailRow(label: 'Peran', value: user?.role.label ?? '-'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openEditProfile(context, ref),
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        label: const Text('Ubah Profil'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openChangePassword(context, ref),
                        icon: const Icon(Icons.lock_reset_outlined, size: 18),
                        label: const Text('Ganti Password'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        const SectionHeader(
          title: 'Tampilan',
          subtitle: 'Pilih tema aplikasi',
        ),
        Card(
          child: RadioGroup<ThemeMode>(
            groupValue: ref.watch(themeModeProvider),
            onChanged: (value) => value == null
                ? null
                : ref.read(themeModeProvider.notifier).setMode(value),
            child: Column(
              children: [
                for (final mode in ThemeMode.values)
                  RadioListTile<ThemeMode>(
                    value: mode,
                    title: Text(switch (mode) {
                      ThemeMode.system => 'Ikuti sistem',
                      ThemeMode.light => 'Terang',
                      ThemeMode.dark => 'Gelap',
                    }),
                  ),
              ],
            ),
          ),
        ),
        // Konfigurasi hak akses hanya relevan bagi administrator.
        if (user?.isAdmin ?? false) ...[
          const SizedBox(height: 24),
          const SectionHeader(
            title: 'Hak Akses Peran',
            subtitle: 'Atur modul yang tampil untuk setiap peran di perangkat ini',
          ),
          const _RoleAccessEditor(),
        ],
        const SizedBox(height: 24),
        const SectionHeader(title: 'Tentang Aplikasi'),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const DetailRow(label: 'Aplikasi', value: AppConfig.appName),
                const DetailRow(
                  label: 'Deskripsi',
                  value: AppConfig.appTagline,
                ),
                DetailRow(label: 'Server API', value: AppConfig.apiBaseUrl),
                const SizedBox(height: 12),
                Text(
                  AppConfig.brandCopyright,
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _openEditProfile(BuildContext context, WidgetRef ref) async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;

    final nameController = TextEditingController(text: user.name);
    final emailController = TextEditingController(text: user.email);

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ubah Profil'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Nama Lengkap'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );

    final name = nameController.text.trim();
    final email = emailController.text.trim();
    nameController.dispose();
    emailController.dispose();

    if (saved != true || !context.mounted) return;

    try {
      final updated = await ref
          .read(authRepositoryProvider)
          .updateProfile(user.id, name: name, email: email);
      ref.read(authControllerProvider.notifier).setUser(updated);
      if (!context.mounted) return;
      showAppSnackBar(context, 'Profil berhasil diperbarui.');
    } catch (error) {
      if (!context.mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  Future<void> _openChangePassword(BuildContext context, WidgetRef ref) async {
    final currentController = TextEditingController();
    final newController = TextEditingController();

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ganti Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password Saat Ini'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Password Baru',
                helperText: 'Minimal 6 karakter',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );

    final current = currentController.text;
    final next = newController.text;
    currentController.dispose();
    newController.dispose();

    if (saved != true || !context.mounted) return;

    if (next.length < 6) {
      showAppSnackBar(context, 'Password baru minimal 6 karakter.',
          isError: true);
      return;
    }

    try {
      await ref.read(authRepositoryProvider).changePassword(
            currentPassword: current,
            newPassword: next,
          );
      if (!context.mounted) return;

      // Backend menghapus sesi setelah password diganti, jadi pengguna harus
      // login ulang dengan kredensial baru.
      showAppSnackBar(
        context,
        'Password berhasil diubah. Silakan login kembali.',
      );
      await ref.read(authControllerProvider.notifier).logout();
    } catch (error) {
      if (!context.mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }
}

/// Editor hak akses per peran.
///
/// Sama seperti di web, konfigurasi ini disimpan lokal dan hanya mengatur
/// modul yang tampil. Backend tetap menjadi penentu akhir lewat `requireRole`.
class _RoleAccessEditor extends ConsumerWidget {
  const _RoleAccessEditor();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(roleAccessProvider);

    return Card(
      child: Column(
        children: [
          for (final role in RoleAccess.managedRoleOrder)
            ExpansionTile(
              title: Text(role.label),
              subtitle: Text(
                role == UserRole.admin
                    ? 'Akses penuh ke seluruh modul'
                    : '${settings[role]?.length ?? 0} dari ${allModuleHrefs.length} modul',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              children: [
                if (role == UserRole.admin)
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Text(
                      'Peran administrator selalu memegang akses penuh dan tidak dapat dibatasi.',
                      style: TextStyle(fontSize: 12),
                    ),
                  )
                else
                  for (final section in moduleSections)
                    for (final item in section.items)
                      CheckboxListTile(
                        dense: true,
                        value: settings[role]?.contains(item.href) ?? false,
                        title: Text(
                          item.title,
                          style: const TextStyle(fontSize: 13),
                        ),
                        subtitle: Text(
                          section.label,
                          style: const TextStyle(fontSize: 11),
                        ),
                        onChanged: (checked) {
                          final next = {
                            for (final entry in settings.entries)
                              entry.key: List<String>.from(entry.value),
                          };
                          final hrefs = next[role] ??= [];

                          if (checked ?? false) {
                            if (!hrefs.contains(item.href)) {
                              hrefs.add(item.href);
                            }
                          } else {
                            hrefs.remove(item.href);
                          }

                          ref.read(roleAccessProvider.notifier).save(next);
                        },
                      ),
              ],
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: OutlinedButton.icon(
              onPressed: () =>
                  ref.read(roleAccessProvider.notifier).resetToDefaults(),
              icon: const Icon(Icons.restart_alt, size: 18),
              label: const Text('Kembalikan ke Pengaturan Bawaan'),
            ),
          ),
        ],
      ),
    );
  }
}
