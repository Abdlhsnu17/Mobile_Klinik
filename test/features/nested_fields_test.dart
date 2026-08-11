import 'package:flutter_application_mobile_apps_klinik/src/features/modules/collection_config.dart';
import 'package:flutter_application_mobile_apps_klinik/src/features/modules/module_configs.dart';
import 'package:flutter_test/flutter_test.dart';

/// Menguji field bersarang (jadwal dokter, item purchase order) dan field
/// acuan yang menggantikan pengetikan id mentah.
void main() {
  group('doctorsConfig.schedules', () {
    final schedules = doctorsConfig.fieldByName('schedules')!;

    test('dapat disunting sebagai daftar objek', () {
      expect(schedules.type, FieldType.objectList);
      expect(schedules.readOnly, isFalse);
      expect(doctorsConfig.editableFields, contains(schedules));
    });

    test('sub-skema sesuai bentuk DoctorSchedule di backend', () {
      final names = schedules.itemFields.map((field) => field.name).toList();

      expect(names, ['day', 'startTime', 'endTime']);
      expect(
        schedules.itemFields.every((field) => field.required),
        isTrue,
      );
    });

    test('meringkas satu baris jadwal', () {
      final label = schedules.describeItem(const {
        'day': 'Senin',
        'startTime': '08:00',
        'endTime': '12:00',
      });

      expect(label, 'Senin 08:00–12:00');
    });

    test('baris yang baru ditambahkan hanya menampilkan hari', () {
      expect(schedules.describeItem(const {'day': 'Rabu'}), 'Rabu');
    });

    test('jam yang terisi sebagian ditandai dengan tanda tanya', () {
      expect(
        schedules.describeItem(const {'day': 'Rabu', 'startTime': '08:00'}),
        'Rabu 08:00–?',
      );
    });

    test('display meringkas jumlah jadwal', () {
      final text = schedules.display([
        const {'day': 'Senin', 'startTime': '08:00', 'endTime': '12:00'},
        const {'day': 'Selasa', 'startTime': '09:00', 'endTime': '13:00'},
        const {'day': 'Rabu', 'startTime': '09:00', 'endTime': '13:00'},
      ]);

      expect(text, contains('Senin 08:00–12:00'));
      expect(text, contains('+1 lainnya'));
    });

    test('daftar kosong ditampilkan sebagai strip', () {
      expect(schedules.display(const <dynamic>[]), '-');
    });
  });

  group('purchaseOrdersConfig.items', () {
    final items = purchaseOrdersConfig.fieldByName('items')!;

    test('wajib diisi karena backend menolak items kosong', () {
      expect(items.type, FieldType.objectList);
      expect(items.required, isTrue);
    });

    test('obat dipilih lewat field acuan, bukan id mentah', () {
      final medicine = items.itemFields
          .firstWhere((field) => field.name == 'medicineId');

      expect(medicine.type, FieldType.reference);
      expect(medicine.referencePath, 'medicines');
      expect(medicine.referenceMirrorField, 'medicineName');
    });

    test('meringkas baris item dengan nama dan jumlah', () {
      final label = items.describeItem(const {
        'medicineName': 'Paracetamol',
        'quantity': 20,
      });

      expect(label, 'Paracetamol × 20');
    });

    test('baris tanpa obat tetap terbaca', () {
      expect(
        items.describeItem(const {'quantity': 0}),
        '(obat belum dipilih) × 0',
      );
    });
  });

  group('purchaseOrdersConfig.deriveFields', () {
    test('menjumlahkan totalAmount dari baris item', () {
      final derived = purchaseOrdersConfig.deriveFields!({
        'items': [
          {'medicineId': 'm1', 'quantity': 10, 'unitPrice': 2500},
          {'medicineId': 'm2', 'quantity': 3, 'unitPrice': 10000},
        ],
      });

      expect(derived['totalAmount'], 55000);
    });

    test('melengkapi receivedQuantity yang diwajibkan tipe backend', () {
      final derived = purchaseOrdersConfig.deriveFields!({
        'items': [
          {'medicineId': 'm1', 'quantity': 5, 'unitPrice': 1000},
        ],
      });

      final items = derived['items'] as List;
      expect((items.first as Map)['receivedQuantity'], 0);
    });

    test('mempertahankan receivedQuantity yang sudah ada', () {
      final derived = purchaseOrdersConfig.deriveFields!({
        'items': [
          {
            'medicineId': 'm1',
            'quantity': 5,
            'unitPrice': 1000,
            'receivedQuantity': 2,
          },
        ],
      });

      final items = derived['items'] as List;
      expect((items.first as Map)['receivedQuantity'], 2);
    });

    test('tanpa item menghasilkan total nol', () {
      final derived = purchaseOrdersConfig.deriveFields!({'items': const []});

      expect(derived['totalAmount'], 0);
      expect(derived['items'], isEmpty);
    });
  });

  group('field acuan', () {
    test('supplier dipilih dari koleksi suppliers', () {
      final supplier = purchaseOrdersConfig.fieldByName('supplierId')!;

      expect(supplier.type, FieldType.reference);
      expect(supplier.referencePath, 'suppliers');
      expect(supplier.referenceMirrorField, 'supplierName');
    });

    test('pasien dipilih dari koleksi patients pada modul rujukan', () {
      final patient = referralsConfig.fieldByName('patientId')!;

      expect(patient.type, FieldType.reference);
      expect(patient.referencePath, 'patients');
      expect(patient.referenceMirrorField, 'patientName');
    });

    test('bed diberi label nomor bed, bukan field name', () {
      final bed = inpatientAdmissionsConfig.fieldByName('bedId')!;

      expect(bed.referencePath, 'beds');
      expect(bed.referenceLabelField, 'bedNumber');
    });

    test('pembayaran tidak memakai mirror karena tak punya kolom nama', () {
      final patient = paymentsConfig.fieldByName('patientId')!;

      expect(patient.type, FieldType.reference);
      expect(patient.referenceMirrorField, isNull);
    });

    test('label acuan default adalah field name', () {
      const field = CollectionField(
        name: 'x',
        label: 'X',
        type: FieldType.reference,
        referencePath: 'patients',
      );

      expect(field.referenceLabelField, 'name');
    });
  });
}
