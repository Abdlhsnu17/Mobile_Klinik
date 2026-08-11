import 'dart:convert';

import 'package:web/web.dart' as web;

/// Mengunduh dokumen melalui browser agar tetap bisa dipakai di web.
Future<void> openDownloadedDocument(
  List<int> bytes, {
  required String fileName,
}) async {
  final url =
      'data:application/octet-stream;base64,${base64Encode(bytes)}';
  final anchor = web.HTMLAnchorElement()
    ..href = url
    ..download = _sanitizeFileName(fileName)
    ..style.display = 'none';

  web.document.body?.append(anchor);
  anchor.click();
  anchor.remove();
}

String _sanitizeFileName(String value) {
  final sanitized = value.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_').trim();
  return sanitized.isEmpty ? 'dokumen' : sanitized;
}
