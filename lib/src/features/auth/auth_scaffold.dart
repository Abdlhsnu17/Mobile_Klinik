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
      body: Stack(
        children: [
          const _AuthBackdrop(),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final horizontalPadding = constraints.maxWidth >= 900 ? 40.0 : 16.0;

                return SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    20,
                    horizontalPadding,
                    20,
                  ),
                  child: ConstrainedBox(
                    constraints:
                        BoxConstraints(minHeight: constraints.maxHeight - 40),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 560),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Theme(
                              data: theme.copyWith(
                                inputDecorationTheme: inputTheme,
                              ),
                              child: child,
                            ),
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
        ],
      ),
    );
  }
}

class _AuthBackdrop extends StatelessWidget {
  const _AuthBackdrop();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? const [
                  Color(0xFF07111F),
                  Color(0xFF0A2433),
                  Color(0xFF0F3C47),
                ]
              : const [
                  Color(0xFFEAF6F7),
                  Color(0xFFDDEFF1),
                  Color(0xFFF7FAFC),
                ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              image: DecorationImage(
                image: AssetImage('assets/images/background.png'),
                fit: BoxFit.cover,
                opacity: 0.18,
              ),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(-0.7, -0.8),
                radius: 1.1,
                colors: [
                  const Color(0xFF00C3C7).withValues(alpha: 0.24),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(1.0, -0.3),
                radius: 1.0,
                colors: [
                  const Color(0xFF00969F).withValues(alpha: 0.18),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          Positioned(
            left: -80,
            top: 80,
            child: _FloatingBlob(
              size: 180,
              color: const Color(0xFF00C3C7).withValues(alpha: 0.14),
            ),
          ),
          Positioned(
            right: -70,
            bottom: 110,
            child: _FloatingBlob(
              size: 220,
              color: const Color(0xFF00969F).withValues(alpha: 0.12),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: isDark ? 0.18 : 0.08),
                    Colors.black.withValues(alpha: isDark ? 0.32 : 0.12),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingBlob extends StatelessWidget {
  const _FloatingBlob({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.45),
            blurRadius: 50,
            spreadRadius: 8,
          ),
        ],
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
