import 'package:flutter_application_mobile_apps_klinik/src/core/utils/json_utils.dart';
import 'package:flutter_test/flutter_test.dart';

/// Backend menyimpan data di MySQL dengan fallback JSON, sehingga tipe sebuah
/// field bisa berbeda antar sumber. Tes ini mengunci perilaku normalisasinya.
void main() {
  group('asInt', () {
    test('menerima int, double, dan string numerik', () {
      expect(asInt(7), 7);
      expect(asInt(7.6), 8);
      expect(asInt('42'), 42);
      expect(asInt('12.7'), 13);
    });

    test('memakai fallback untuk nilai yang tidak terbaca', () {
      expect(asInt(null), 0);
      expect(asInt('bukan angka', fallback: -1), -1);
    });
  });

  group('asDouble', () {
    test('mengubah berbagai bentuk numerik', () {
      expect(asDouble(5), 5.0);
      expect(asDouble('1250.5'), 1250.5);
      expect(asDouble(null, fallback: 3), 3.0);
    });
  });

  group('asBool', () {
    test('mengenali representasi boolean dari MySQL', () {
      expect(asBool(true), isTrue);
      expect(asBool(1), isTrue);
      expect(asBool('1'), isTrue);
      expect(asBool('ya'), isTrue);
      expect(asBool(0), isFalse);
      expect(asBool('false'), isFalse);
      expect(asBool('tidak'), isFalse);
    });

    test('memakai fallback untuk nilai asing', () {
      expect(asBool('mungkin', fallback: true), isTrue);
    });
  });

  group('asStringOrNull', () {
    test('memperlakukan string kosong sebagai null', () {
      expect(asStringOrNull(''), isNull);
      expect(asStringOrNull(null), isNull);
      expect(asStringOrNull('halo'), 'halo');
    });

    test('mengubah nilai non-string menjadi teks', () {
      expect(asStringOrNull(12), '12');
    });
  });

  group('asMapList', () {
    test('menormalkan daftar objek bersarang', () {
      final result = asMapList([
        {'day': 'Senin'},
        {'day': 'Selasa'},
      ]);

      expect(result, hasLength(2));
      expect(result.first['day'], 'Senin');
    });

    test('mengembalikan daftar kosong untuk masukan non-list', () {
      expect(asMapList(null), isEmpty);
      expect(asMapList('bukan list'), isEmpty);
    });
  });

  group('asStringList', () {
    test('membuang entri null di dalam array', () {
      expect(asStringList(['a', null, 'b']), ['a', 'b']);
    });
  });

  group('compactJson', () {
    test('membuang entri bernilai null', () {
      final result = compactJson({'a': 1, 'b': null, 'c': 'x'});

      expect(result, {'a': 1, 'c': 'x'});
    });
  });
}
