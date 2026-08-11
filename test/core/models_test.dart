import 'package:flutter_application_mobile_apps_klinik/src/models/clinic_models.dart';
import 'package:flutter_application_mobile_apps_klinik/src/models/report_models.dart';
import 'package:flutter_application_mobile_apps_klinik/src/models/user.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AppUser', () {
    test('mengurai profil dari respons auth', () {
      final user = AppUser.fromJson(const {
        'id': 'usr-1',
        'username': 'budi',
        'name': 'Budi Santoso',
        'email': 'budi@klinik.id',
        'role': 'dokter',
      });

      expect(user.role, UserRole.dokter);
      expect(user.isAdmin, isFalse);
      expect(user.initials, 'BS');
    });

    test('peran tak dikenal jatuh ke umum', () {
      final user = AppUser.fromJson(const {'role': 'tidak-ada'});

      expect(user.role, UserRole.umum);
    });

    test('menerima avatar dari kunci lama maupun baru', () {
      expect(
        AppUser.fromJson(const {'avatarUrl': '/a.png'}).avatarUrl,
        '/a.png',
      );
      expect(AppUser.fromJson(const {'avatar': '/b.png'}).avatarUrl, '/b.png');
    });

    test('inisial jatuh ke username bila nama kosong', () {
      final user = AppUser.fromJson(const {'username': 'admin', 'name': ''});

      expect(user.initials, 'A');
    });
  });

  group('Patient', () {
    test('menghitung umur dari tanggal lahir', () {
      final born = DateTime.now().subtract(const Duration(days: 365 * 30 + 8));
      final patient = Patient.fromJson({
        'birthDate': born.toIso8601String().substring(0, 10),
      });

      expect(patient.age, 30);
    });

    test('umur null bila tanggal lahir tidak terbaca', () {
      expect(Patient.fromJson(const {'birthDate': ''}).age, isNull);
    });

    test('menandai pasien dengan riwayat alergi', () {
      expect(Patient.fromJson(const {'allergies': 'Penisilin'}).hasAllergy,
          isTrue);
      expect(Patient.fromJson(const {'allergies': '  '}).hasAllergy, isFalse);
    });
  });

  group('Medicine', () {
    test('membedakan stok habis dan stok menipis', () {
      final empty = Medicine.fromJson(const {'stock': 0, 'minStock': 5});
      final low = Medicine.fromJson(const {'stock': 3, 'minStock': 5});
      final healthy = Medicine.fromJson(const {'stock': 20, 'minStock': 5});

      expect(empty.isOutOfStock, isTrue);
      expect(low.isLowStock, isTrue);
      expect(healthy.isLowStock, isFalse);
      expect(healthy.isOutOfStock, isFalse);
    });

    test('memakai sellPrice ketika price belum diisi', () {
      final medicine = Medicine.fromJson(const {'sellPrice': 7500});

      expect(medicine.price, 7500);
    });

    test('menghitung sisa hari menuju kedaluwarsa', () {
      final expiry = DateTime.now().add(const Duration(days: 10));
      final medicine = Medicine.fromJson({
        'expiryDate': expiry.toIso8601String().substring(0, 10),
      });

      expect(medicine.daysUntilExpiry, 10);
    });
  });

  group('Appointment', () {
    test('mengurai status dan triase', () {
      final appointment = Appointment.fromJson(const {
        'status': 'Diperiksa',
        'queueNumber': 3,
        'triage': {
          'vitalSigns': {'bloodPressure': '120/80'},
          'recordedAt': '2026-08-11T08:00:00.000Z',
        },
      });

      expect(appointment.status, AppointmentStatus.diperiksa);
      expect(appointment.hasTriage, isTrue);
      expect(appointment.triage!.vitalSigns.bloodPressure, '120/80');
    });

    test('status tak dikenal jatuh ke Menunggu', () {
      expect(
        Appointment.fromJson(const {'status': '???'}).status,
        AppointmentStatus.menunggu,
      );
    });

    test('displayServices memakai daftar multi-layanan bila tersedia', () {
      final multi = Appointment.fromJson(const {
        'serviceName': 'Lama',
        'serviceNames': ['Konsultasi', 'Lab'],
      });
      final legacy = Appointment.fromJson(const {'serviceName': 'Konsultasi'});

      expect(multi.displayServices, ['Konsultasi', 'Lab']);
      expect(legacy.displayServices, ['Konsultasi']);
    });
  });

  group('ClinicService', () {
    test('layanan tanpa daftar spesialisasi cocok untuk semua dokter', () {
      final service = ClinicService.fromJson(const {'name': 'Konsultasi'});

      expect(service.matchesSpecialization('Anak'), isTrue);
    });

    test('layanan terbatas hanya cocok dengan spesialisasi terdaftar', () {
      final service = ClinicService.fromJson(const {
        'applicableSpecializations': ['Anak'],
      });

      expect(service.matchesSpecialization('Anak'), isTrue);
      expect(service.matchesSpecialization('Bedah'), isFalse);
    });
  });

  group('MedicalRecord', () {
    test('mengenali rekam medis yang terkunci', () {
      expect(MedicalRecord.fromJson(const {'status': 'locked'}).isLocked, isTrue);
      expect(MedicalRecord.fromJson(const {'status': 'draft'}).isLocked, isFalse);
    });

    test('mengurai resep bersarang', () {
      final record = MedicalRecord.fromJson(const {
        'prescription': [
          {'medicineName': 'Paracetamol', 'quantity': 10},
        ],
      });

      expect(record.prescription, hasLength(1));
      expect(record.prescription.first.medicineName, 'Paracetamol');
    });
  });

  group('CashierDailySummary', () {
    test('kas seharusnya adalah penerimaan dikurangi pengeluaran tunai', () {
      final summary = CashierDailySummary.fromJson(const {
        'systemCashTotal': 500000,
        'cashExpenseTotal': 125000,
      });

      expect(summary.expectedCashTotal, 375000);
    });
  });

  group('OperationalAlertsResponse', () {
    test('mengurai ringkasan dan daftar peringatan', () {
      final response = OperationalAlertsResponse.fromJson(const {
        'generatedAt': '2026-08-11T00:00:00.000Z',
        'summary': {
          'total': 2,
          'critical': 1,
          'warning': 1,
          'byCategory': {'stok-menipis': 2},
        },
        'alerts': [
          {
            'id': 'a1',
            'category': 'stok-menipis',
            'severity': 'critical',
            'title': 'Stok Paracetamol menipis',
          },
        ],
      });

      expect(response.summary.total, 2);
      expect(response.summary.byCategory['stok-menipis'], 2);
      expect(response.alerts.first.category, AlertCategory.stokMenipis);
      expect(response.alerts.first.severity, AlertSeverity.critical);
    });
  });
}
