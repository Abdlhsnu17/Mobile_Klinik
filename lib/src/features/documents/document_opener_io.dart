import 'dart:io';

import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

/// Menyimpan dokumen ke file sementara lalu membukanya dengan aplikasi bawaan.
Future<void> openDownloadedDocument(
  List<int> bytes, {
  required String fileName,
}) async {
  final directory = await getTemporaryDirectory();
  final file = File('${directory.path}/${_sanitizeFileName(fileName)}');
  await file.writeAsBytes(bytes, flush: true);

  final result = await OpenFilex.open(file.path);
  if (result.type != ResultType.done) {
    throw StateError(
      'Dokumen tersimpan di ${file.path}, tetapi tidak ada aplikasi yang dapat membukanya.',
    );
  }
}

String _sanitizeFileName(String value) {
  final sanitized = value.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_').trim();
  return sanitized.isEmpty ? 'dokumen' : sanitized;
}
