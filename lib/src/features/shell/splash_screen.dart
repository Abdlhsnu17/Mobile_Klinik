import 'package:flutter/material.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';

/// Layar sementara selama sesi tersimpan diverifikasi ke backend.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppTheme.brandGradient),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/images/abdi-care-logo.png',
                height: 84,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.local_hospital_outlined,
                  size: 64,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                AppConfig.appName,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                AppConfig.appTagline,
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 28),
              const SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
