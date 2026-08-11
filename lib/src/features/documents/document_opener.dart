export 'document_opener_stub.dart'
    if (dart.library.io) 'document_opener_io.dart'
    if (dart.library.html) 'document_opener_web.dart';
