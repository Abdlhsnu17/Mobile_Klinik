import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/modules/module_routes.dart';
import '../../features/shell/app_shell.dart';
import '../../features/shell/splash_screen.dart';
import '../access/role_access.dart';
import '../providers.dart';

/// Konfigurasi navigasi aplikasi.
///
/// Path sengaja disamakan dengan rute Next.js (`/antrian`, `/pemeriksaan`, …)
/// supaya registri modul dan konfigurasi hak akses dapat dipakai ulang apa
/// adanya.
final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _AuthRefreshNotifier(ref);
  ref.onDispose(refreshListenable.dispose);

  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final path = state.matchedLocation;

      // Tahan navigasi sampai pemulihan sesi selesai agar pengguna yang sudah
      // login tidak sempat melihat halaman login.
      if (auth.isInitializing) return path == '/splash' ? null : '/splash';

      final isAuthRoute = RoleAccess.publicPaths.contains(path);

      if (!auth.isAuthenticated) return isAuthRoute ? null : '/login';

      // Sudah login tetapi membuka halaman publik — arahkan ke beranda peran.
      if (isAuthRoute || path == '/splash') {
        return RoleAccess.landingPath(auth.role, ref.read(roleAccessProvider));
      }

      // Modul yang tidak diizinkan untuk peran ini.
      if (!RoleAccess.canAccessPath(auth.role, path, ref.read(roleAccessProvider))) {
        return '/akses-ditolak';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/daftar',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/lupa-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/akses-ditolak',
        builder: (context, state) => const AccessDeniedScreen(),
      ),

      // Seluruh modul berbagi kerangka yang sama (drawer navigasi + header).
      ShellRoute(
        builder: (context, state, child) => AppShell(
          location: state.matchedLocation,
          child: child,
        ),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          ...moduleRoutes,
        ],
      ),
    ],
    errorBuilder: (context, state) => NotFoundScreen(path: state.uri.path),
  );
});

/// Menjembatani perubahan state Riverpod ke `refreshListenable` GoRouter agar
/// redirect dievaluasi ulang saat pengguna login atau sesi berakhir.
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    _removeListener = ref.listen<AuthState>(
      authControllerProvider,
      (previous, next) {
        if (previous?.status != next.status) notifyListeners();
      },
    ).close;
  }

  late final VoidCallback _removeListener;

  @override
  void dispose() {
    _removeListener();
    super.dispose();
  }
}

class AccessDeniedScreen extends StatelessWidget {
  const AccessDeniedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Akses Ditolak')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                'Anda tidak memiliki akses ke modul ini',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              const Text(
                'Hubungi administrator klinik bila Anda merasa seharusnya dapat membuka halaman ini.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.go('/dashboard'),
                child: const Text('Kembali ke Dashboard'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key, required this.path});

  final String path;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Halaman tidak ditemukan')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.help_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Rute "$path" tidak dikenali.'),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.go('/dashboard'),
                child: const Text('Kembali ke Dashboard'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
