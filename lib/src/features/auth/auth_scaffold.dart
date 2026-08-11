import 'package:flutter/material.dart';

import '../../core/config/app_config.dart';

/// Kerangka halaman autentikasi: latar foto klinik, panel kaca, dan logo.
///
/// Padanan `AuthShell` + `GlassCard` di frontend Next.js.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final inputTheme = theme.inputDecorationTheme.copyWith(
      filled: true,
      fillColor: theme.brightness == Brightness.dark
          ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35)
          : Colors.white.withValues(alpha: 0.68),
      contentPadding: const EdgeInsets.fromLTRB(14, 18, 14, 14),
      floatingLabelBehavior: FloatingLabelBehavior.auto,
      floatingLabelStyle: theme.textTheme.bodySmall?.copyWith(
        color: theme.colorScheme.primary.withValues(alpha: 0.8),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
          width: 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: theme.colorScheme.primary.withValues(alpha: 0.72),
          width: 1.15,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: theme.colorScheme.error.withValues(alpha: 0.6),
          width: 1,
        ),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: theme.colorScheme.error.withValues(alpha: 0.82),
          width: 1.15,
        ),
      ),
    );

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/background.png'),
            fit: BoxFit.cover,
          ),
        ),
        child: Container(
          // Lapisan gelap tipis menjaga kontras teks di atas foto latar.
          color: Colors.black.withValues(alpha: 0.35),
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  child: ConstrainedBox(
                    constraints:
                        BoxConstraints(minHeight: constraints.maxHeight),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 560),
                          child: Theme(
                            data: theme.copyWith(inputDecorationTheme: inputTheme),
                            child: child,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          AppConfig.brandCopyright,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

/// Logo dan nama sistem di kepala setiap halaman autentikasi.
class AuthBrandHeader extends StatelessWidget {
  const AuthBrandHeader({super.key, this.subtitle});

  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Image.asset(
          'assets/images/abdi-care-logo.png',
          height: 64,
          // Logo hanya dekoratif; kegagalan memuatnya tidak boleh mengosongkan
          // kepala halaman.
          errorBuilder: (context, error, stackTrace) => const Icon(
            Icons.local_hospital_outlined,
            size: 48,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          AppConfig.appTagline,
          style: theme.textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 2),
        Text(
          '"${AppConfig.appName}"',
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.outline,
            letterSpacing: 4,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 10),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.outline),
          ),
        ],
      ],
    );
  }
}

/// Kotak pesan kesalahan di dalam form autentikasi.
class AuthErrorBanner extends StatelessWidget {
  const AuthErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.error.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, size: 18, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onErrorContainer),
            ),
          ),
        ],
      ),
    );
  }
}
