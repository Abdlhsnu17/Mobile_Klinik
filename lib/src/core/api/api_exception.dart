/// Kesalahan yang berasal dari lapisan API.
///
/// Padanan `ApiClientError` di frontend Next.js, termasuk pemetaan pesan
/// ramah-pengguna berbahasa Indonesia.
class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.method,
    this.path,
    this.requestId,
  });

  final String message;
  final int? statusCode;
  final String? method;
  final String? path;
  final String? requestId;

  /// Server menolak karena hak akses peran tidak mencukupi.
  bool get isForbidden => statusCode == 403;

  /// Sesi habis atau token tidak valid.
  bool get isUnauthorized => statusCode == 401;

  bool get isNotFound => statusCode == 404;

  /// Kegagalan jaringan (tidak ada respons dari server sama sekali).
  bool get isNetworkError => statusCode == null;

  @override
  String toString() => message;
}

/// Menyusun pesan error yang dapat dibaca pengguna akhir.
///
/// Pesan dari backend dipakai bila tersedia; selain itu status HTTP
/// diterjemahkan ke kalimat yang menjelaskan langkah berikutnya.
String friendlyApiErrorMessage({
  required int status,
  String? payloadMessage,
  String fallbackMessage = 'Permintaan ditolak server.',
}) {
  final fromServer = payloadMessage?.trim();
  if (fromServer != null && fromServer.isNotEmpty) return fromServer;

  switch (status) {
    case 400:
      return 'Data yang dikirim tidak valid. Periksa kembali isian Anda.';
    case 401:
      return 'Sesi Anda telah berakhir, silakan login kembali.';
    case 403:
      return 'Anda tidak memiliki akses untuk aksi ini.';
    case 404:
      return 'Data yang diminta tidak ditemukan.';
    case 409:
      return 'Data sudah ada atau bentrok dengan data lain.';
    case 413:
      return 'Ukuran berkas terlalu besar untuk diunggah.';
    case 429:
      return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
    case 503:
      return 'Layanan sedang tidak tersedia. Coba lagi beberapa saat.';
    default:
      if (status >= 500) {
        return 'Terjadi kesalahan di server. Coba lagi beberapa saat.';
      }
      return fallbackMessage;
  }
}
