import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';

/// Lencana status berwarna, padanan komponen `Badge` di frontend Next.js.
///
/// Warna dipilih dari makna status agar konsisten di seluruh modul: hijau
/// untuk keadaan selesai/aktif, kuning untuk menunggu, merah untuk
/// batal/gagal, biru untuk proses berjalan.
class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key, this.icon});

  final String? status;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final label = Formatters.humanizeSlug(status);
    final color = colorFor(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  /// Memetakan status backend (Indonesia maupun Inggris) ke warna semantik.
  static Color colorFor(String? status) {
    final normalized = (status ?? '').toLowerCase().trim();

    const successStates = {
      'selesai', 'aktif', 'tersedia', 'paid', 'completed', 'fulfilled',
      'dispensed', 'approved', 'signed', 'final', 'discharged', 'available',
      'sent', 'baik', 'reviewed', 'verified', 'locked',
    };
    const warningStates = {
      'menunggu', 'pending', 'requested', 'draft', 'stok rendah', 'dipesan',
      'waiting_payment', 'partially_paid', 'submitted', 'diterima-sebagian',
      'perlu perbaikan', 'cleaning', 'scheduled', 'sample_taken',
    };
    const dangerStates = {
      'batal', 'cancelled', 'rejected', 'failed', 'habis', 'rusak',
      'tidak aktif', 'non-aktif', 'nonaktif', 'deceased', 'expired',
    };
    const infoStates = {
      'dipanggil', 'diperiksa', 'processing', 'ongoing', 'occupied',
      'digunakan', 'dalam perawatan', 'performed', 'reported', 'referred',
      'received', 'followed-up', 'maintenance',
    };

    if (successStates.contains(normalized)) return AppTheme.success;
    if (warningStates.contains(normalized)) return AppTheme.warning;
    if (dangerStates.contains(normalized)) return AppTheme.danger;
    if (infoStates.contains(normalized)) return AppTheme.info;
    return const Color(0xFF64748B);
  }
}
