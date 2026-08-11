import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import 'auth_scaffold.dart';

/// Halaman login — port dari `apps/frontend/app/login/page.tsx`.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _remember = false;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRememberedUsername();
    _showSessionExpiredNotice();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadRememberedUsername() async {
    final username = await ref.read(sessionStoreProvider).readRememberedUsername();
    if (!mounted || username == null || username.isEmpty) return;

    setState(() {
      _usernameController.text = username;
      _remember = true;
    });
  }

  /// Beri tahu pengguna bila mereka sampai di sini karena token kedaluwarsa,
  /// bukan karena menekan tombol keluar.
  void _showSessionExpiredNotice() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!ref.read(authControllerProvider).sessionExpired) return;

      setState(() => _error = 'Sesi Anda telah berakhir, silakan login kembali.');
      ref.read(authControllerProvider.notifier).acknowledgeSessionExpired();
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final username = _usernameController.text.trim();

    try {
      // Hanya username yang diingat — password tidak pernah disimpan.
      await ref
          .read(sessionStoreProvider)
          .writeRememberedUsername(_remember ? username : null);

      await ref
          .read(authControllerProvider.notifier)
          .login(username, _passwordController.text);

      // Redirect router akan memindahkan ke beranda sesuai peran.
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AuthBrandHeader(),
            const SizedBox(height: 24),
            if (_error != null) ...[
              AuthErrorBanner(message: _error!),
              const SizedBox(height: 16),
            ],
            TextFormField(
              controller: _usernameController,
              enabled: !_isLoading,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Username atau Email',
                hintText: 'Masukkan username atau email',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? 'Username atau email wajib diisi'
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _passwordController,
              enabled: !_isLoading,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: 'Password',
                hintText: 'Masukkan password',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  tooltip: _obscurePassword
                      ? 'Tampilkan password'
                      : 'Sembunyikan password',
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              validator: (value) =>
                  (value == null || value.isEmpty) ? 'Password wajib diisi' : null,
            ),
            const SizedBox(height: 6),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              runSpacing: 4,
              children: [
                SizedBox(
                  width: 180,
                  child: CheckboxListTile(
                    value: _remember,
                    onChanged: _isLoading
                        ? null
                        : (value) => setState(() => _remember = value ?? false),
                    title: const Text(
                      'Ingat saya',
                      style: TextStyle(fontSize: 13),
                    ),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ),
                ),
                TextButton(
                  onPressed: _isLoading
                      ? null
                      : () => context.push('/lupa-password'),
                  child: const Text('Lupa Password?'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _isLoading ? null : _submit,
              child: _isLoading
                  ? const _ButtonProgress(label: 'Memproses...')
                  : const Text('Login'),
            ),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 4,
              runSpacing: 4,
              children: [
                const Text(
                  'Belum memiliki akun?',
                  style: TextStyle(fontSize: 13),
                ),
                TextButton(
                  onPressed: _isLoading ? null : () => context.push('/daftar'),
                  child: const Text('Daftar sekarang'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Indikator proses di dalam tombol kirim.
class _ButtonProgress extends StatelessWidget {
  const _ButtonProgress({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(
          height: 16,
          width: 16,
          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
        ),
        const SizedBox(width: 10),
        Text(label),
      ],
    );
  }
}
