import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/collection_repository.dart';
import '../models/user.dart';
import 'access/role_access.dart';
import 'api/api_client.dart';
import 'auth/auth_repository.dart';
import 'auth/session_store.dart';

/// Provider inti aplikasi: penyimpanan sesi, klien HTTP, repositori, dan
/// state autentikasi.

final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(sessionStore: ref.watch(sessionStoreProvider));

  // Setiap 401 dari server berarti token tidak lagi berlaku; akhiri sesi agar
  // router memindahkan pengguna ke halaman login.
  client.onUnauthorized = () {
    ref.read(authControllerProvider.notifier).handleSessionExpired();
  };

  return client;
});

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(
      apiClient: ref.watch(apiClientProvider),
      sessionStore: ref.watch(sessionStoreProvider),
    ));

final collectionRepositoryProvider = Provider<CollectionRepository>(
  (ref) => CollectionRepository(apiClient: ref.watch(apiClientProvider)),
);

/// Status proses pemulihan sesi saat aplikasi dibuka.
enum AuthStatus { initializing, authenticated, unauthenticated }

@immutable
class AuthState {
  const AuthState({
    this.status = AuthStatus.initializing,
    this.user,
    this.sessionExpired = false,
  });

  final AuthStatus status;
  final AppUser? user;

  /// True bila sesi berakhir sendiri (token kedaluwarsa), bukan karena
  /// pengguna menekan tombol keluar — dipakai untuk menampilkan pesan.
  final bool sessionExpired;

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get isInitializing => status == AuthStatus.initializing;
  UserRole? get role => user?.role;

  AuthState copyWith({
    AuthStatus? status,
    AppUser? user,
    bool? sessionExpired,
    bool clearUser = false,
  }) =>
      AuthState(
        status: status ?? this.status,
        user: clearUser ? null : (user ?? this.user),
        sessionExpired: sessionExpired ?? this.sessionExpired,
      );
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState()) {
    _restore();
  }

  final Ref _ref;

  AuthRepository get _repository => _ref.read(authRepositoryProvider);

  Future<void> _restore() async {
    final repository = _repository;

    // Tampilkan profil lokal lebih dulu supaya aplikasi langsung terpakai,
    // lalu verifikasi token ke server di belakang layar.
    try {
      final user = await repository.restoreSession();
      state = user == null
          ? const AuthState(status: AuthStatus.unauthenticated)
          : AuthState(status: AuthStatus.authenticated, user: user);
    } catch (_) {
      // Token ditolak atau server tidak terjangkau. Bila profil lokal masih
      // ada, biarkan pengguna masuk secara offline; permintaan berikutnya yang
      // gagal 401 akan mengakhiri sesi.
      final cached = await repository.cachedUser();
      state = cached == null
          ? const AuthState(status: AuthStatus.unauthenticated)
          : AuthState(status: AuthStatus.authenticated, user: cached);
    }
  }

  Future<AppUser> login(String username, String password) async {
    final user = await _repository.login(username, password);
    state = AuthState(status: AuthStatus.authenticated, user: user);
    return user;
  }

  Future<AppUser> register({
    required String username,
    required String password,
    required String name,
    required String email,
  }) async {
    final user = await _repository.register(
      username: username,
      password: password,
      name: name,
      email: email,
    );
    state = AuthState(status: AuthStatus.authenticated, user: user);
    return user;
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Dipanggil klien HTTP saat server membalas 401.
  void handleSessionExpired() {
    if (state.status == AuthStatus.unauthenticated) return;

    _ref.read(sessionStoreProvider).clearSession();
    state = const AuthState(
      status: AuthStatus.unauthenticated,
      sessionExpired: true,
    );
  }

  void acknowledgeSessionExpired() {
    if (!state.sessionExpired) return;
    state = state.copyWith(sessionExpired: false);
  }

  /// Menyegarkan profil di state setelah diubah dari layar pengaturan.
  void setUser(AppUser user) {
    state = state.copyWith(status: AuthStatus.authenticated, user: user);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(AuthController.new);

/// Konfigurasi hak akses per peran, dimuat dari penyimpanan lokal.
class RoleAccessController extends StateNotifier<Map<UserRole, List<String>>> {
  RoleAccessController(this._ref) : super(RoleAccess.defaultSettings()) {
    _load();
  }

  final Ref _ref;

  Future<void> _load() async {
    final raw = await _ref.read(sessionStoreProvider).readRoleAccess();
    state = RoleAccess.fromStorage(raw);
  }

  Future<void> save(Map<UserRole, List<String>> settings) async {
    final normalized = RoleAccess.normalize(settings);
    state = normalized;
    await _ref
        .read(sessionStoreProvider)
        .writeRoleAccess(RoleAccess.toStorage(normalized));
  }

  Future<void> resetToDefaults() => save(RoleAccess.defaultSettings());
}

final roleAccessProvider = StateNotifierProvider<RoleAccessController,
    Map<UserRole, List<String>>>(RoleAccessController.new);

/// Href modul yang boleh dibuka pengguna saat ini.
final allowedModuleHrefsProvider = Provider<Set<String>>((ref) {
  final role = ref.watch(authControllerProvider).role;
  final settings = ref.watch(roleAccessProvider);
  return RoleAccess.allowedModuleHrefs(role, settings);
});

/// Mode tema yang dipilih pengguna (terang/gelap/ikut sistem).
class ThemeModeController extends StateNotifier<ThemeMode> {
  ThemeModeController(this._ref) : super(ThemeMode.system) {
    _load();
  }

  final Ref _ref;

  Future<void> _load() async {
    final stored = await _ref.read(sessionStoreProvider).readThemeMode();
    state = switch (stored) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await _ref.read(sessionStoreProvider).writeThemeMode(mode.name);
  }
}

final themeModeProvider =
    StateNotifierProvider<ThemeModeController, ThemeMode>(ThemeModeController.new);
