import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Format tanggal berbahasa Indonesia dipakai di seluruh aplikasi, sehingga
  // datanya perlu dimuat sebelum widget pertama dibangun.
  await initializeDateFormatting('id_ID');

  runApp(const ProviderScope(child: ClinicApp()));
}
