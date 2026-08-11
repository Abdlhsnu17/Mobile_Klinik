import 'package:flutter_application_mobile_apps_klinik/src/features/modules/collection_config.dart';
import 'package:flutter_application_mobile_apps_klinik/src/features/modules/module_configs.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CollectionField.parseInput', () {
    const numberField = CollectionField(
      name: 'stock',
      label: 'Stok',
      type: FieldType.number,
    );
    const currencyField = CollectionField(
      name: 'price',
      label: 'Harga',
      type: FieldType.currency,
    );
    const textField = CollectionField(name: 'name', label: 'Nama');

    test('mengembalikan null untuk masukan kosong', () {
      expect(numberField.parseInput(''), isNull);
      expect(textField.parseInput('   '), isNull);
    });

    test('membaca angka bulat', () {
      expect(numberField.parseInput('42'), 42);
    });

    test('membuang pemisah ribuan bergaya Indonesia', () {
      expect(currencyField.parseInput('12.500'), 12500);
      expect(currencyField.parseInput('Rp 1.250.000'), 1250000);
    });

    test('memperlakukan koma sebagai pemisah desimal', () {
      expect(currencyField.parseInput('1500,75'), 1500.75);
    });

    test('memangkas spasi pada teks biasa', () {
      expect(textField.parseInput('  Budi  '), 'Budi');
    });
  });

  group('CollectionField.display', () {
    test('memformat mata uang dan angka', () {
      const price = CollectionField(
        name: 'price',
        label: 'Harga',
        type: FieldType.currency,
      );

      expect(price.display(15000), contains('15.000'));
      expect(price.display(null), '-');
    });

    test('memetakan nilai select ke labelnya', () {
      const status = CollectionField(
        name: 'status',
        label: 'Status',
        type: FieldType.select,
        options: [FieldOption('requested', 'Diminta')],
      );

      expect(status.display('requested'), 'Diminta');
    });

    test('memakai slug yang dimanusiakan untuk nilai select tak dikenal', () {
      const status = CollectionField(
        name: 'status',
        label: 'Status',
        type: FieldType.select,
        options: [FieldOption('requested', 'Diminta')],
      );

      expect(status.display('diterima-sebagian'), 'Diterima Sebagian');
    });

    test('meringkas nilai bersarang yang tidak punya editor khusus', () {
      const schedules = CollectionField(name: 'schedules', label: 'Jadwal');

      expect(schedules.display([1, 2, 3]), '3 item');
      expect(schedules.display(const <dynamic>[]), '-');
    });

    test('merender boolean sebagai Ya/Tidak', () {
      const isActive = CollectionField(
        name: 'isActive',
        label: 'Aktif',
        type: FieldType.switchToggle,
      );

      expect(isActive.display(true), 'Ya');
      expect(isActive.display(false), 'Tidak');
    });
  });

  group('CollectionConfig', () {
    test('matchesQuery mencocokkan field yang ditandai searchable', () {
      final record = {'name': 'Budi Santoso', 'noRM': 'RM-001', 'nik': '32'};

      expect(patientsConfig.matchesQuery(record, 'budi'), isTrue);
      expect(patientsConfig.matchesQuery(record, 'RM-001'), isTrue);
      expect(patientsConfig.matchesQuery(record, 'tidak ada'), isFalse);
    });

    test('kueri kosong mencocokkan semua record', () {
      expect(patientsConfig.matchesQuery(const {}, '   '), isTrue);
    });

    test('sortRecords mengurutkan data terbaru lebih dulu', () {
      final sorted = patientsConfig.sortRecords([
        {'name': 'A', 'createdAt': '2026-01-01'},
        {'name': 'B', 'createdAt': '2026-08-01'},
      ]);

      expect(sorted.first['name'], 'B');
    });

    test('filterValues mengumpulkan nilai unik terurut', () {
      final values = patientsConfig.filterValues([
        {'gender': 'Perempuan'},
        {'gender': 'Laki-laki'},
        {'gender': 'Perempuan'},
      ]);

      expect(values, ['Laki-laki', 'Perempuan']);
    });

    test('editableFields tidak menyertakan field hanya-baca', () {
      final names = patientsConfig.editableFields.map((f) => f.name);

      expect(names, isNot(contains('createdAt')));
    });

    test('koleksi jejak audit bersifat hanya-baca', () {
      expect(auditLogsConfig.canCreate, isFalse);
      expect(auditLogsConfig.canEdit, isFalse);
      expect(auditLogsConfig.canDelete, isFalse);
    });

    test('mutasi stok tidak dapat dibuat manual', () {
      expect(stockMovementsConfig.canCreate, isFalse);
    });
  });
}
