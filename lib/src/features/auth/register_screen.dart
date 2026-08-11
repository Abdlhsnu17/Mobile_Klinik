import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import 'auth_scaffold.dart';

/// Halaman pendaftaran akun — port dari `apps/frontend/app/daftar/page.tsx`.
///
/// Akun baru selalu dibuat dengan peran `umum`; administrator dapat menaikkan
/// perannya lewat modul Pengguna.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ref.read(authControllerProvider.notifier).register(
            username: _usernameController.text,
            password: _passwordController.text,
            name: _nameController.text,
            email: _emailController.text,
          );
      // Backend langsung membuat sesi, sehingga router memindahkan pengguna
      // ke beranda tanpa perlu login ulang.
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
            const AuthBrandHeader(
              subtitle: 'Buat akun untuk mengakses sistem informasi klinik.',
            ),
            const SizedBox(height: 22),
            if (_error != null) ...[
              AuthErrorBanner(message: _error!),
              const SizedBox(height: 16),
            ],
            TextFormField(
              controller: _nameController,
              enabled: !_isLoading,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Nama Lengkap',
                prefixIcon: Icon(Icons.badge_outlined),
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? 'Nama lengkap wajib diisi'
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _usernameController,
              enabled: !_isLoading,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Username',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (value) {
                final username = value?.trim() ?? '';
                if (username.isEmpty) return 'Username wajib diisi';
                if (username.length < 3) {
                  return 'Username minimal 3 karakter';
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _emailController,
              enabled: !_isLoading,
              autocorrect: false,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.mail_outline),
              ),
              validator: _validateEmail,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _passwordController,
              enabled: !_isLoading,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outline),
                helperText: 'Minimal 6 karakter',
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              // Backend memvalidasi `isLength({ min: 6 })`; cocokkan di klien
              // agar pengguna tidak perlu menunggu balasan server.
              validator: (value) => (value == null || value.length < 6)
                  ? 'Password minimal 6 karakter'
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _confirmPasswordController,
              enabled: !_isLoading,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: const InputDecoration(
                labelText: 'Konfirmasi Password',
                prefixIcon: Icon(Icons.lock_reset_outlined),
              ),
              validator: (value) => value != _passwordController.text
                  ? 'Konfirmasi password tidak cocok'
                  : null,
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: _isLoading ? null : _submit,
              child: _isLoading
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Daftar'),
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 4,
              runSpacing: 4,
              children: [
                const Text('Sudah punya akun?', style: TextStyle(fontSize: 13)),
                TextButton(
                  onPressed: _isLoading
                      ? null
                      : () => context.canPop()
                          ? context.pop()
                          : context.go('/login'),
                  child: const Text('Login'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) return 'Email wajib diisi';

    final isValid = RegExp(r'^[\w.+-]+@[\w-]+\.[\w.-]+$').hasMatch(email);
    return isValid ? null : 'Format email tidak valid';
  }
}
