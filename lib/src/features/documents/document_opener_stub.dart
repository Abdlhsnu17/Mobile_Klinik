/// Fallback bila platform spesifik tidak tersedia saat analisis.
Future<void> openDownloadedDocument(
  List<int> bytes, {
  required String fileName,
}) async {
  throw UnsupportedError('Document opening is not supported on this platform.');
}
