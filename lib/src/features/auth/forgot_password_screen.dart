import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../shared/widgets/common_widgets.dart';
import 'auth_scaffold.dart';

/// Alur lupa password dua langkah — port dari
/// `apps/frontend/app/lupa-password/page.tsx`.
///
/// Langkah 1 meminta token reset lewat email, langkah 2 menukar token itu
/// dengan password baru.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

enum _ResetStep { requestToken, submitNewPassword }

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _requestFormKey = GlobalKey<FormState>();
  final _resetFormKey = GlobalKey<FormState>();

  final _emailController = TextEditingController();
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  _ResetStep _step = _ResetStep.requestToken;
  bool _isLoading = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _emailController.dispose();
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _requestToken() async {
    if (!(_requestFormKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _error = null;
      _info = null;
    });

    try {
      final devToken = await ref
          .read(authRepositoryProvider)
          .requestPasswordReset(_emailController.text);
      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _step = _ResetStep.submitNewPassword;
        // Di luar production backend mengembalikan token langsung agar dapat
        // diuji tanpa layanan email aktif.
        if (devToken != null) _tokenController.text = devToken;
        _info = devToken != null
            ? 'Mode pengembangan: token reset telah diisikan otomatis.'
            : 'Bila email terdaftar, instruksi reset telah dikirim. Periksa kotak masuk Anda.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _submitNewPassword() async {
    if (!(_resetFormKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).resetPassword(
            _tokenController.text,
            _passwordController.text,
          );
      if (!mounted) return;

      showAppSnackBar(
        context,
        'Password berhasil diubah. Silakan login dengan password baru.',
      );
      context.go('/login');
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
    final isRequestStep = _step == _ResetStep.requestToken;

    return AuthScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthBrandHeader(
            subtitle: isRequestStep
                ? 'Masukkan email akun Anda untuk menerima token reset password.'
                : 'Masukkan token yang Anda terima beserta password baru.',
          ),
          const SizedBox(height: 22),
          if (_error != null) ...[
            AuthErrorBanner(message: _error!),
            const SizedBox(height: 14),
          ],
          if (_info != null) ...[
            _InfoBanner(message: _info!),
            const SizedBox(height: 14),
          ],
          if (isRequestStep) _buildRequestForm() else _buildResetForm(),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _isLoading
                ? null
                : () => context.canPop() ? context.pop() : context.go('/login'),
            child: const Text('Kembali ke halaman login'),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestForm() {
    return Form(
      key: _requestFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _emailController,
            enabled: !_isLoading,
            autocorrect: false,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _requestToken(),
            decoration: const InputDecoration(
              labelText: 'Email terdaftar',
              prefixIcon: Icon(Icons.mail_outline),
            ),
            validator: (value) {
              final email = value?.trim() ?? '';
              if (email.isEmpty) return 'Email wajib diisi';
              final isValid =
                  RegExp(r'^[\w.+-]+@[\w-]+\.[\w.-]+$').hasMatch(email);
              return isValid ? null : 'Format email tidak valid';
            },
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _isLoading ? null : _requestToken,
            child: _isLoading
                ? const _Spinner()
                : const Text('Kirim Instruksi Reset'),
          ),
        ],
      ),
    );
  }

  Widget _buildResetForm() {
    return Form(
      key: _resetFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _tokenController,
            enabled: !_isLoading,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'Token Reset',
              prefixIcon: Icon(Icons.vpn_key_outlined),
            ),
            validator: (value) => (value == null || value.trim().isEmpty)
                ? 'Token reset wajib diisi'
                : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _passwordController,
            enabled: !_isLoading,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Password Baru',
              prefixIcon: Icon(Icons.lock_outline),
              helperText: 'Minimal 6 karakter',
            ),
            validator: (value) => (value == null || value.length < 6)
                ? 'Password minimal 6 karakter'
                : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _confirmPasswordController,
            enabled: !_isLoading,
            obscureText: true,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submitNewPassword(),
            decoration: const InputDecoration(
              labelText: 'Konfirmasi Password Baru',
              prefixIcon: Icon(Icons.lock_reset_outlined),
            ),
            validator: (value) => value != _passwordController.text
                ? 'Konfirmasi password tidak cocok'
                : null,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _isLoading ? null : _submitNewPassword,
            child: _isLoading ? const _Spinner() : const Text('Simpan Password Baru'),
          ),
          TextButton(
            onPressed: _isLoading
                ? null
                : () => setState(() {
                      _step = _ResetStep.requestToken;
                      _error = null;
                      _info = null;
                    }),
            child: const Text('Minta token baru'),
          ),
        ],
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 18, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message, style: theme.textTheme.bodySmall),
          ),
        ],
      ),
    );
  }
}

class _Spinner extends StatelessWidget {
  const _Spinner();

  @override
  Widget build(BuildContext context) => const SizedBox(
        height: 16,
        width: 16,
        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
      );
}
