import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';

/// State daftar sebuah koleksi beserta kata kunci dan filter aktif.
class CollectionState {
  const CollectionState({
    this.records = const [],
    this.isLoading = true,
    this.error,
    this.query = '',
    this.filter,
  });

  final List<Map<String, dynamic>> records;
  final bool isLoading;
  final Object? error;
  final String query;

  /// Nilai chip filter yang dipilih; null berarti "Semua".
  final String? filter;

  CollectionState copyWith({
    List<Map<String, dynamic>>? records,
    bool? isLoading,
    Object? error,
    String? query,
    String? filter,
    bool clearError = false,
    bool clearFilter = false,
  }) =>
      CollectionState(
        records: records ?? this.records,
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        query: query ?? this.query,
        filter: clearFilter ? null : (filter ?? this.filter),
      );
}

/// Memuat dan memutakhirkan satu koleksi lewat [CollectionRepository].
///
/// Operasi tulis selalu diikuti pemuatan ulang agar daftar mencerminkan hasil
/// perhitungan server (nomor antrian, total tagihan, stempel waktu).
class CollectionController extends StateNotifier<CollectionState> {
  CollectionController(this._ref, this.path) : super(const CollectionState()) {
    load();
  }

  final Ref _ref;
  final String path;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final records = await _ref.read(collectionRepositoryProvider).list(path);
      if (!mounted) return;
      state = state.copyWith(records: records, isLoading: false);
    } catch (error) {
      if (!mounted) return;
      state = state.copyWith(isLoading: false, error: error);
    }
  }

  Future<void> create(Map<String, dynamic> body) async {
    await _ref.read(collectionRepositoryProvider).create(path, body);
    await load();
  }

  Future<void> update(String id, Map<String, dynamic> body) async {
    await _ref.read(collectionRepositoryProvider).update(path, id, body);
    await load();
  }

  Future<void> remove(String id) async {
    await _ref.read(collectionRepositoryProvider).remove(path, id);
    await load();
  }

  void setQuery(String query) => state = state.copyWith(query: query);

  void setFilter(String? filter) => filter == null
      ? state = state.copyWith(clearFilter: true)
      : state = state.copyWith(filter: filter);
}

/// Satu controller per path koleksi, dibagikan antar layar yang membutuhkan.
final collectionControllerProvider = StateNotifierProvider.family<
    CollectionController, CollectionState, String>(
  (ref, path) => CollectionController(ref, path),
);

/// Isi koleksi untuk mengisi pilihan field bertipe acuan.
///
/// Hasilnya di-cache selama formulir terbuka sehingga beberapa baris daftar
/// bersarang yang menunjuk koleksi sama hanya memicu satu permintaan.
final referenceOptionsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
  (ref, path) => ref.read(collectionRepositoryProvider).list(path),
);
