import 'package:flutter/material.dart';

import '../../core/utils/json_utils.dart';
import 'collection_config.dart';

/// Konfigurasi tiap modul koleksi.
///
/// Field dan pilihan nilainya mengikuti `packages/types/index.ts` serta
/// validator backend di `src/validators/collectionSchemas.ts`, sehingga
/// formulir di aplikasi menolak data yang pasti akan ditolak server.

const _genderOptions = [
  FieldOption('Laki-laki'),
  FieldOption('Perempuan'),
];

const _activeStatusOptions = [
  FieldOption('Aktif'),
  FieldOption('Tidak Aktif'),
];

/// Pemilih pasien. Backend menyimpan `patientId` bersama `patientName` secara
/// denormalisasi, jadi keduanya selalu dipasangkan.
const _patientReference = CollectionField(
  name: 'patientId',
  label: 'Pasien',
  type: FieldType.reference,
  required: true,
  referencePath: 'patients',
  referenceMirrorField: 'patientName',
);

const _patientNameField = CollectionField(
  name: 'patientName',
  label: 'Nama Pasien',
  required: true,
  searchable: true,
  helperText: 'Terisi otomatis dari pasien yang dipilih',
);

/// Pemilih dokter beserta nama pendampingnya.
const _doctorReference = CollectionField(
  name: 'doctorId',
  label: 'Dokter',
  type: FieldType.reference,
  referencePath: 'doctors',
  referenceMirrorField: 'doctorName',
);

/// Master pasien — modul "Rekam Medic" (`/pasien`).
final patientsConfig = CollectionConfig(
  path: 'patients',
  title: 'Data Pasien',
  singular: 'Pasien',
  icon: Icons.groups_outlined,
  titleField: 'name',
  subtitleField: 'noRM',
  filterField: 'gender',
  sortDescendingBy: 'createdAt',
  emptyMessage: 'Tambahkan pasien untuk mulai mencatat kunjungan dan rekam medis.',
  fields: const [
    CollectionField(
      name: 'noRM',
      label: 'No. Rekam Medis',
      required: true,
      searchable: true,
      showInList: true,
    ),
    CollectionField(
      name: 'nik',
      label: 'NIK',
      required: true,
      searchable: true,
      helperText: '16 digit sesuai KTP',
    ),
    CollectionField(
      name: 'name',
      label: 'Nama Lengkap',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'birthDate',
      label: 'Tanggal Lahir',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'gender',
      label: 'Jenis Kelamin',
      type: FieldType.select,
      options: _genderOptions,
      required: true,
    ),
    CollectionField(
      name: 'phone',
      label: 'No. Telepon',
      type: FieldType.phone,
      required: true,
      searchable: true,
      showInList: true,
    ),
    CollectionField(name: 'email', label: 'Email', type: FieldType.email),
    CollectionField(
      name: 'address',
      label: 'Alamat',
      type: FieldType.multiline,
      required: true,
    ),
    CollectionField(
      name: 'bloodType',
      label: 'Golongan Darah',
      type: FieldType.select,
      options: [
        FieldOption('A'),
        FieldOption('B'),
        FieldOption('AB'),
        FieldOption('O'),
      ],
    ),
    CollectionField(
      name: 'allergies',
      label: 'Riwayat Alergi',
      type: FieldType.multiline,
      helperText: 'Kosongkan bila tidak ada alergi yang diketahui',
    ),
    CollectionField(name: 'emergencyContact', label: 'Kontak Darurat'),
    CollectionField(
      name: 'emergencyPhone',
      label: 'Telepon Darurat',
      type: FieldType.phone,
    ),
    CollectionField(
      name: 'createdAt',
      label: 'Terdaftar',
      type: FieldType.date,
      readOnly: true,
    ),
  ],
);

/// Master dokter (`/dokter`).
final doctorsConfig = CollectionConfig(
  path: 'doctors',
  title: 'Data Dokter',
  singular: 'Dokter',
  icon: Icons.medical_services_outlined,
  titleField: 'name',
  subtitleField: 'specialization',
  statusField: 'status',
  filterField: 'specialization',
  fields: const [
    CollectionField(
      name: 'name',
      label: 'Nama Dokter',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'specialization',
      label: 'Spesialisasi',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'phone',
      label: 'No. Telepon',
      type: FieldType.phone,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'email',
      label: 'Email',
      type: FieldType.email,
      required: true,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      options: _activeStatusOptions,
      defaultValue: 'Aktif',
      required: true,
    ),
    CollectionField(
      name: 'schedules',
      label: 'Jadwal Praktik',
      type: FieldType.objectList,
      showInList: true,
      helperText: 'Tambahkan hari dan jam praktik dokter',
      itemLabel: _describeSchedule,
      itemFields: [
        CollectionField(
          name: 'day',
          label: 'Hari',
          type: FieldType.select,
          required: true,
          options: [
            FieldOption('Senin'),
            FieldOption('Selasa'),
            FieldOption('Rabu'),
            FieldOption('Kamis'),
            FieldOption('Jumat'),
            FieldOption('Sabtu'),
            FieldOption('Minggu'),
          ],
        ),
        CollectionField(
          name: 'startTime',
          label: 'Jam Mulai',
          type: FieldType.time,
          required: true,
        ),
        CollectionField(
          name: 'endTime',
          label: 'Jam Selesai',
          type: FieldType.time,
          required: true,
        ),
      ],
    ),
  ],
);

/// Ringkasan satu baris jadwal, mis. "Senin 08:00–12:00".
String _describeSchedule(Map<String, dynamic> item) {
  final day = asString(item['day'], fallback: '-');
  final start = asStringOrNull(item['startTime']);
  final end = asStringOrNull(item['endTime']);

  if (start == null && end == null) return day;
  return '$day ${start ?? '?'}–${end ?? '?'}';
}

/// Katalog layanan klinis (`/layanan-klinis`).
final servicesConfig = CollectionConfig(
  path: 'services',
  title: 'Layanan Klinis',
  singular: 'Layanan',
  icon: Icons.assignment_outlined,
  titleField: 'name',
  subtitleField: 'category',
  statusField: 'status',
  filterField: 'category',
  fields: const [
    CollectionField(
      name: 'name',
      label: 'Nama Layanan',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'category',
      label: 'Kategori',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('Konsultasi'),
        FieldOption('Pemeriksaan'),
        FieldOption('Tindakan'),
        FieldOption('Laboratorium'),
        FieldOption('Radiologi'),
      ],
    ),
    CollectionField(
      name: 'price',
      label: 'Tarif',
      type: FieldType.currency,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'duration',
      label: 'Durasi (menit)',
      type: FieldType.number,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'description',
      label: 'Deskripsi',
      type: FieldType.multiline,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      options: _activeStatusOptions,
      defaultValue: 'Aktif',
      required: true,
    ),
  ],
);

/// Master kode ICD-10 / ICD-9-CM (`/kode-diagnosa`).
final medicalCodesConfig = CollectionConfig(
  path: 'medical-codes',
  title: 'Kode Diagnosa & Tindakan',
  singular: 'Kode',
  icon: Icons.sell_outlined,
  titleField: 'name',
  subtitleField: 'code',
  filterField: 'system',
  fields: const [
    CollectionField(
      name: 'code',
      label: 'Kode',
      required: true,
      searchable: true,
      showInList: true,
    ),
    CollectionField(
      name: 'name',
      label: 'Nama / Deskripsi',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'system',
      label: 'Sistem Klasifikasi',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('icd10', 'ICD-10 (Diagnosa)'),
        FieldOption('icd9cm', 'ICD-9-CM (Tindakan)'),
      ],
    ),
    CollectionField(name: 'category', label: 'Kategori', searchable: true),
    CollectionField(
      name: 'isActive',
      label: 'Aktif',
      type: FieldType.switchToggle,
      defaultValue: true,
    ),
  ],
);

/// Depo farmasi — master obat (`/depo-farmasi`).
final medicinesConfig = CollectionConfig(
  path: 'medicines',
  title: 'Depo Farmasi',
  singular: 'Obat',
  icon: Icons.warehouse_outlined,
  titleField: 'name',
  subtitleField: 'genericName',
  statusField: 'status',
  filterField: 'category',
  fields: const [
    CollectionField(name: 'code', label: 'Kode Obat', searchable: true),
    CollectionField(
      name: 'name',
      label: 'Nama Obat',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'genericName',
      label: 'Nama Generik',
      searchable: true,
    ),
    CollectionField(
      name: 'category',
      label: 'Kategori',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('Obat Bebas'),
        FieldOption('Obat Bebas Terbatas'),
        FieldOption('Obat Keras'),
        FieldOption('Obat Narkotika'),
      ],
    ),
    CollectionField(
      name: 'form',
      label: 'Bentuk Sediaan',
      type: FieldType.select,
      options: [
        FieldOption('Tablet'),
        FieldOption('Kapsul'),
        FieldOption('Sirup'),
        FieldOption('Injeksi'),
        FieldOption('Salep'),
        FieldOption('Tetes'),
        FieldOption('Inhaler'),
      ],
    ),
    CollectionField(name: 'strength', label: 'Kekuatan', helperText: 'mis. 500 mg'),
    CollectionField(name: 'unit', label: 'Satuan', defaultValue: 'pcs'),
    CollectionField(
      name: 'stock',
      label: 'Stok',
      type: FieldType.number,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'minStock',
      label: 'Stok Minimum',
      type: FieldType.number,
      showInList: true,
      helperText: 'Ambang munculnya peringatan stok menipis',
    ),
    CollectionField(
      name: 'price',
      label: 'Harga Jual',
      type: FieldType.currency,
      showInList: true,
    ),
    CollectionField(name: 'manufacturer', label: 'Produsen'),
    CollectionField(
      name: 'expiryDate',
      label: 'Tanggal Kedaluwarsa',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(name: 'location', label: 'Lokasi Penyimpanan'),
    CollectionField(
      name: 'description',
      label: 'Keterangan',
      type: FieldType.multiline,
    ),
  ],
);

/// Inventori alat medis (`/alat-medis`).
final medicalEquipmentsConfig = CollectionConfig(
  path: 'medical-equipments',
  title: 'Alat Medis',
  singular: 'Alat Medis',
  icon: Icons.build_outlined,
  titleField: 'name',
  subtitleField: 'brand',
  statusField: 'status',
  filterField: 'category',
  fields: const [
    CollectionField(name: 'code', label: 'Kode Alat', searchable: true),
    CollectionField(
      name: 'name',
      label: 'Nama Alat',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'category',
      label: 'Kategori',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('Diagnostik'),
        FieldOption('Terapeutik'),
        FieldOption('Bedah'),
        FieldOption('Sterilisasi'),
        FieldOption('Monitoring'),
        FieldOption('Lainnya'),
      ],
    ),
    CollectionField(name: 'brand', label: 'Merek', searchable: true),
    CollectionField(name: 'model', label: 'Model'),
    CollectionField(
      name: 'quantity',
      label: 'Jumlah',
      type: FieldType.number,
      showInList: true,
    ),
    CollectionField(
      name: 'condition',
      label: 'Kondisi',
      type: FieldType.select,
      options: [
        FieldOption('Baik'),
        FieldOption('Perlu Perbaikan'),
        FieldOption('Rusak'),
      ],
    ),
    CollectionField(name: 'location', label: 'Lokasi'),
    CollectionField(
      name: 'purchaseDate',
      label: 'Tanggal Pembelian',
      type: FieldType.date,
    ),
    CollectionField(
      name: 'lastMaintenanceDate',
      label: 'Maintenance Terakhir',
      type: FieldType.date,
    ),
    CollectionField(
      name: 'nextMaintenanceDate',
      label: 'Maintenance Berikutnya',
      type: FieldType.date,
      showInList: true,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'Tersedia',
      options: [
        FieldOption('Tersedia'),
        FieldOption('Digunakan'),
        FieldOption('Dalam Perawatan'),
        FieldOption('Tidak Aktif'),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Order laboratorium (`/laboratorium`).
final labOrdersConfig = CollectionConfig(
  path: 'lab-orders',
  title: 'Order Laboratorium',
  singular: 'Order Lab',
  icon: Icons.science_outlined,
  titleField: 'patientName',
  subtitleField: 'doctorName',
  statusField: 'status',
  filterField: 'status',
  sortDescendingBy: 'requestedAt',
  fields: const [
    _patientReference,
    _patientNameField,
    _doctorReference,
    CollectionField(
      name: 'doctorName',
      label: 'Dokter Pengirim',
      searchable: true,
      helperText: 'Terisi otomatis dari dokter yang dipilih',
    ),
    CollectionField(name: 'medicalRecordId', label: 'ID Rekam Medis'),
    CollectionField(
      name: 'priority',
      label: 'Prioritas',
      type: FieldType.select,
      defaultValue: 'routine',
      options: [
        FieldOption('routine', 'Rutin'),
        FieldOption('urgent', 'Segera'),
      ],
      showInList: true,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'requested',
      options: [
        FieldOption('requested', 'Diminta'),
        FieldOption('sample_taken', 'Sampel Diambil'),
        FieldOption('processing', 'Diproses'),
        FieldOption('completed', 'Selesai'),
        FieldOption('reviewed', 'Sudah Dibaca'),
        FieldOption('cancelled', 'Dibatalkan'),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
    CollectionField(
      name: 'requestedAt',
      label: 'Waktu Permintaan',
      type: FieldType.date,
      readOnly: true,
      showInList: true,
    ),
  ],
);

/// Hasil pemeriksaan laboratorium.
final labResultsConfig = CollectionConfig(
  path: 'lab-results',
  title: 'Hasil Laboratorium',
  singular: 'Hasil Lab',
  icon: Icons.biotech_outlined,
  titleField: 'testName',
  subtitleField: 'resultValue',
  sortDescendingBy: 'performedAt',
  fields: const [
    CollectionField(
      name: 'testName',
      label: 'Nama Pemeriksaan',
      required: true,
      searchable: true,
    ),
    _patientReference,
    CollectionField(
      name: 'labOrderId',
      label: 'Order Lab',
      type: FieldType.reference,
      referencePath: 'lab-orders',
      referenceLabelField: 'patientName',
    ),
    CollectionField(
      name: 'resultValue',
      label: 'Nilai Hasil',
      required: true,
      showInList: true,
    ),
    CollectionField(name: 'unit', label: 'Satuan', showInList: true),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
    CollectionField(
      name: 'performedAt',
      label: 'Waktu Pemeriksaan',
      type: FieldType.date,
      showInList: true,
    ),
  ],
);

/// Order radiologi (`/radiologi`).
final radiologyOrdersConfig = CollectionConfig(
  path: 'radiology-orders',
  title: 'Order Radiologi',
  singular: 'Order Radiologi',
  icon: Icons.radar_outlined,
  titleField: 'patientName',
  subtitleField: 'study',
  statusField: 'status',
  filterField: 'status',
  sortDescendingBy: 'requestedAt',
  fields: const [
    _patientReference,
    _patientNameField,
    CollectionField(
      name: 'study',
      label: 'Jenis Pemeriksaan',
      required: true,
      searchable: true,
      helperText: 'mis. Thorax PA, USG Abdomen',
    ),
    _doctorReference,
    CollectionField(
      name: 'doctorName',
      label: 'Dokter Pengirim',
      helperText: 'Terisi otomatis dari dokter yang dipilih',
    ),
    CollectionField(name: 'medicalRecordId', label: 'ID Rekam Medis'),
    CollectionField(
      name: 'priority',
      label: 'Prioritas',
      type: FieldType.select,
      defaultValue: 'routine',
      options: [
        FieldOption('routine', 'Rutin'),
        FieldOption('urgent', 'Segera'),
      ],
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'requested',
      options: [
        FieldOption('requested', 'Diminta'),
        FieldOption('scheduled', 'Dijadwalkan'),
        FieldOption('performed', 'Dikerjakan'),
        FieldOption('reported', 'Sudah Dibacakan'),
        FieldOption('reviewed', 'Sudah Dibaca Dokter'),
        FieldOption('cancelled', 'Dibatalkan'),
      ],
    ),
    CollectionField(
      name: 'indication',
      label: 'Indikasi Klinis',
      type: FieldType.multiline,
    ),
    CollectionField(
      name: 'findings',
      label: 'Temuan',
      type: FieldType.multiline,
    ),
    CollectionField(
      name: 'impression',
      label: 'Kesan',
      type: FieldType.multiline,
    ),
    CollectionField(
      name: 'requestedAt',
      label: 'Waktu Permintaan',
      type: FieldType.date,
      readOnly: true,
      showInList: true,
    ),
  ],
);

/// Tempat tidur rawat inap.
final bedsConfig = CollectionConfig(
  path: 'beds',
  title: 'Tempat Tidur',
  singular: 'Bed',
  icon: Icons.bed_outlined,
  titleField: 'bedNumber',
  subtitleField: 'ward',
  statusField: 'status',
  filterField: 'ward',
  fields: const [
    CollectionField(
      name: 'bedNumber',
      label: 'Nomor Bed',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'ward',
      label: 'Bangsal',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'available',
      required: true,
      options: [
        FieldOption('available', 'Tersedia'),
        FieldOption('occupied', 'Terisi'),
        FieldOption('cleaning', 'Pembersihan'),
        FieldOption('maintenance', 'Perawatan'),
      ],
    ),
    CollectionField(
      name: 'lastCleanedAt',
      label: 'Terakhir Dibersihkan',
      type: FieldType.date,
      showInList: true,
    ),
  ],
);

/// Admisi rawat inap (`/rawat-inap`).
final inpatientAdmissionsConfig = CollectionConfig(
  path: 'inpatient-admissions',
  title: 'Admisi Rawat Inap',
  singular: 'Admisi',
  icon: Icons.local_hotel_outlined,
  titleField: 'patientName',
  subtitleField: 'ward',
  statusField: 'status',
  filterField: 'status',
  sortDescendingBy: 'admittedAt',
  fields: const [
    _patientReference,
    _patientNameField,
    CollectionField(
      name: 'bedId',
      label: 'Bed',
      type: FieldType.reference,
      required: true,
      referencePath: 'beds',
      // Bed diidentifikasi lewat nomornya, bukan field `name`.
      referenceLabelField: 'bedNumber',
      referenceMirrorField: 'bedNumber',
    ),
    CollectionField(
      name: 'bedNumber',
      label: 'Nomor Bed',
      required: true,
      showInList: true,
      helperText: 'Terisi otomatis dari bed yang dipilih',
    ),
    CollectionField(
      name: 'ward',
      label: 'Bangsal',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'admittedAt',
      label: 'Waktu Masuk',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'expectedDischarge',
      label: 'Perkiraan Pulang',
      type: FieldType.date,
    ),
    CollectionField(name: 'attendingDoctorName', label: 'Dokter Penanggung Jawab'),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'ongoing',
      options: [
        FieldOption('pending', 'Menunggu'),
        FieldOption('ongoing', 'Sedang Dirawat'),
        FieldOption('discharged', 'Sudah Pulang'),
        FieldOption('referred', 'Dirujuk'),
        FieldOption('deceased', 'Meninggal'),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Catatan visit dokter untuk pasien rawat inap.
final doctorVisitNotesConfig = CollectionConfig(
  path: 'doctor-visit-notes',
  title: 'Catatan Visit Dokter',
  singular: 'Catatan Visit',
  icon: Icons.note_alt_outlined,
  titleField: 'doctorName',
  subtitleField: 'date',
  sortDescendingBy: 'date',
  fields: const [
    CollectionField(
      name: 'admissionId',
      label: 'Admisi',
      type: FieldType.reference,
      required: true,
      referencePath: 'inpatient-admissions',
      // Admisi paling mudah dikenali lewat nama pasiennya.
      referenceLabelField: 'patientName',
    ),
    CollectionField(
      name: 'doctorId',
      label: 'Dokter',
      type: FieldType.reference,
      required: true,
      referencePath: 'doctors',
      referenceMirrorField: 'doctorName',
    ),
    CollectionField(
      name: 'doctorName',
      label: 'Nama Dokter',
      required: true,
      searchable: true,
      helperText: 'Terisi otomatis dari dokter yang dipilih',
    ),
    CollectionField(
      name: 'date',
      label: 'Tanggal Visit',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'note',
      label: 'Catatan Visit',
      type: FieldType.multiline,
      required: true,
      searchable: true,
    ),
  ],
);

/// Pembayaran pasien (`/pembayaran`).
final paymentsConfig = CollectionConfig(
  path: 'payments',
  title: 'Pembayaran',
  singular: 'Pembayaran',
  icon: Icons.credit_card_outlined,
  titleField: 'patientId',
  subtitleField: 'method',
  filterField: 'method',
  sortDescendingBy: 'paidAt',
  fields: const [
    // Tanpa `referenceMirrorField`: tipe PaymentRecord hanya menyimpan
    // patientId, tidak ada kolom nama pasien.
    CollectionField(
      name: 'patientId',
      label: 'Pasien',
      type: FieldType.reference,
      required: true,
      referencePath: 'patients',
    ),
    CollectionField(
      name: 'medicalRecordId',
      label: 'ID Rekam Medis',
      required: true,
    ),
    CollectionField(
      name: 'amount',
      label: 'Jumlah Bayar',
      type: FieldType.currency,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'method',
      label: 'Metode Pembayaran',
      type: FieldType.select,
      required: true,
      defaultValue: 'tunai',
      options: [
        FieldOption('tunai', 'Tunai'),
        FieldOption('transfer-himbara', 'Transfer HIMBARA'),
        FieldOption('qris', 'QRIS'),
        FieldOption('bpjs', 'BPJS'),
        FieldOption('asuransi-swasta', 'Asuransi Swasta'),
        FieldOption('asuransi-bumn', 'Asuransi BUMN'),
        FieldOption('asuransi-syariah', 'Asuransi Syariah'),
      ],
    ),
    CollectionField(
      name: 'paymentSource',
      label: 'Sumber Dana',
      type: FieldType.select,
      defaultValue: 'patient',
      helperText: 'Dana asuransi tidak dihitung sebagai kas kasir',
      options: [
        FieldOption('patient', 'Pasien'),
        FieldOption('insurance', 'Asuransi'),
      ],
    ),
    CollectionField(
      name: 'paidAt',
      label: 'Waktu Bayar',
      type: FieldType.date,
      showInList: true,
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Tagihan pasien.
final billingRecordsConfig = CollectionConfig(
  path: 'billing-records',
  title: 'Tagihan',
  singular: 'Tagihan',
  icon: Icons.receipt_long_outlined,
  titleField: 'patientName',
  subtitleField: 'medicalRecordId',
  statusField: 'status',
  filterField: 'status',
  sortDescendingBy: 'createdAt',
  // Total tagihan dihitung server dari komponen biaya; pembuatan manual lewat
  // aplikasi akan menghasilkan angka yang tidak konsisten.
  canCreate: false,
  fields: const [
    CollectionField(name: 'patientName', label: 'Nama Pasien', searchable: true),
    CollectionField(name: 'patientId', label: 'ID Pasien', searchable: true),
    CollectionField(name: 'medicalRecordId', label: 'ID Rekam Medis'),
    CollectionField(
      name: 'serviceCost',
      label: 'Biaya Layanan',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'medicineCost',
      label: 'Biaya Obat',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'labCost',
      label: 'Biaya Lab',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'inpatientCost',
      label: 'Biaya Rawat Inap',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'discount',
      label: 'Diskon',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'insuranceCoverage',
      label: 'Ditanggung Asuransi',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'total',
      label: 'Total Tagihan',
      type: FieldType.currency,
      readOnly: true,
      showInList: true,
    ),
    CollectionField(
      name: 'paidAmount',
      label: 'Sudah Dibayar',
      type: FieldType.currency,
      readOnly: true,
      showInList: true,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      options: [
        FieldOption('draft', 'Draft'),
        FieldOption('calculated', 'Terhitung'),
        FieldOption('waiting_payment', 'Menunggu Pembayaran'),
        FieldOption('partially_paid', 'Dibayar Sebagian'),
        FieldOption('paid', 'Lunas'),
        FieldOption('claimed_to_insurance', 'Diklaim ke Asuransi'),
        FieldOption('cancelled', 'Dibatalkan'),
      ],
    ),
  ],
);

/// Profil penjamin/asuransi pasien (`/asuransi`).
final insuranceProfilesConfig = CollectionConfig(
  path: 'insurance-profiles',
  title: 'Profil Asuransi',
  singular: 'Profil Asuransi',
  icon: Icons.verified_user_outlined,
  titleField: 'patientName',
  subtitleField: 'policyNumber',
  filterField: 'provider',
  fields: const [
    _patientReference,
    _patientNameField,
    CollectionField(
      name: 'provider',
      label: 'Penjamin',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('bpjs', 'BPJS'),
        FieldOption('asuransi-swasta', 'Asuransi Swasta'),
      ],
    ),
    CollectionField(
      name: 'policyNumber',
      label: 'Nomor Polis',
      required: true,
      searchable: true,
    ),
    CollectionField(name: 'planName', label: 'Nama Paket', required: true),
    CollectionField(
      name: 'validUntil',
      label: 'Berlaku Sampai',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'rateMultiplier',
      label: 'Pengali Tarif',
      type: FieldType.currency,
      helperText: 'mis. 1 untuk tarif normal',
      showInList: true,
    ),
    CollectionField(
      name: 'coverageNotes',
      label: 'Catatan Pertanggungan',
      type: FieldType.multiline,
    ),
  ],
);

/// Data peserta bridging asuransi.
final insuranceBridgeMembersConfig = CollectionConfig(
  path: 'insurance-bridge-members',
  title: 'Peserta Bridging',
  singular: 'Peserta',
  icon: Icons.badge_outlined,
  titleField: 'name',
  subtitleField: 'participantNumber',
  statusField: 'status',
  filterField: 'coverageLevel',
  fields: const [
    CollectionField(
      name: 'name',
      label: 'Nama Peserta',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'participantNumber',
      label: 'Nomor Peserta',
      required: true,
      searchable: true,
    ),
    CollectionField(name: 'facility', label: 'Faskes', searchable: true),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      options: [
        FieldOption('aktif', 'Aktif'),
        FieldOption('non-aktif', 'Non-aktif'),
      ],
    ),
    CollectionField(
      name: 'coverageLevel',
      label: 'Tingkat Layanan',
      type: FieldType.select,
      options: [
        FieldOption('primer', 'Primer'),
        FieldOption('sekunder', 'Sekunder'),
      ],
    ),
    CollectionField(
      name: 'lastClaimDate',
      label: 'Klaim Terakhir',
      type: FieldType.date,
      showInList: true,
    ),
  ],
);

/// Supplier obat dan alat (`/pengadaan`).
final suppliersConfig = CollectionConfig(
  path: 'suppliers',
  title: 'Supplier',
  singular: 'Supplier',
  icon: Icons.storefront_outlined,
  titleField: 'name',
  subtitleField: 'contactPerson',
  statusField: 'status',
  filterField: 'status',
  fields: const [
    CollectionField(name: 'code', label: 'Kode Supplier', searchable: true),
    CollectionField(
      name: 'name',
      label: 'Nama Supplier',
      required: true,
      searchable: true,
    ),
    CollectionField(name: 'contactPerson', label: 'Narahubung'),
    CollectionField(
      name: 'phone',
      label: 'Telepon',
      type: FieldType.phone,
      showInList: true,
    ),
    CollectionField(name: 'email', label: 'Email', type: FieldType.email),
    CollectionField(
      name: 'address',
      label: 'Alamat',
      type: FieldType.multiline,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'aktif',
      options: [
        FieldOption('aktif', 'Aktif'),
        FieldOption('nonaktif', 'Nonaktif'),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Purchase order pengadaan.
final purchaseOrdersConfig = CollectionConfig(
  path: 'purchase-orders',
  title: 'Purchase Order',
  singular: 'Purchase Order',
  icon: Icons.local_shipping_outlined,
  titleField: 'poNumber',
  subtitleField: 'supplierName',
  statusField: 'status',
  filterField: 'status',
  sortDescendingBy: 'orderDate',
  fields: const [
    CollectionField(
      name: 'poNumber',
      label: 'Nomor PO',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'supplierId',
      label: 'Supplier',
      type: FieldType.reference,
      required: true,
      referencePath: 'suppliers',
      referenceMirrorField: 'supplierName',
    ),
    // Diisi otomatis dari supplier terpilih; backend menyimpannya bersama id.
    CollectionField(
      name: 'supplierName',
      label: 'Nama Supplier',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'orderDate',
      label: 'Tanggal Pesan',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'expectedDate',
      label: 'Perkiraan Datang',
      type: FieldType.date,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'draft',
      options: [
        FieldOption('draft', 'Draft'),
        FieldOption('dipesan', 'Dipesan'),
        FieldOption('diterima-sebagian', 'Diterima Sebagian'),
        FieldOption('selesai', 'Selesai'),
        FieldOption('batal', 'Batal'),
      ],
    ),
    // Backend tidak menghitung totalAmount, jadi nilainya diturunkan dari
    // baris item lewat `deriveFields` di bawah.
    CollectionField(
      name: 'totalAmount',
      label: 'Total Nilai',
      type: FieldType.currency,
      readOnly: true,
      showInList: true,
    ),
    CollectionField(
      name: 'items',
      label: 'Item Pesanan',
      type: FieldType.objectList,
      required: true,
      showInList: true,
      helperText: 'Minimal satu obat harus dipesan',
      itemLabel: _describePurchaseOrderItem,
      itemFields: [
        CollectionField(
          name: 'medicineId',
          label: 'Obat',
          type: FieldType.reference,
          required: true,
          referencePath: 'medicines',
          referenceMirrorField: 'medicineName',
        ),
        CollectionField(
          name: 'quantity',
          label: 'Jumlah',
          type: FieldType.number,
          required: true,
          defaultValue: 1,
        ),
        CollectionField(
          name: 'unitPrice',
          label: 'Harga Satuan',
          type: FieldType.currency,
          required: true,
          defaultValue: 0,
        ),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
  deriveFields: _derivePurchaseOrderTotals,
);

/// Ringkasan satu baris item PO, mis. "Paracetamol × 20".
String _describePurchaseOrderItem(Map<String, dynamic> item) {
  final name = asStringOrNull(item['medicineName']) ??
      asStringOrNull(item['medicineId']) ??
      '(obat belum dipilih)';
  return '$name × ${asInt(item['quantity'])}';
}

/// Menghitung `totalAmount` dan melengkapi `receivedQuantity` tiap baris.
///
/// Backend memvalidasi bentuk item tetapi tidak menjumlahkan totalnya, dan
/// tipe `PurchaseOrderItem` mengharuskan `receivedQuantity` ada sejak awal.
Map<String, dynamic> _derivePurchaseOrderTotals(Map<String, dynamic> body) {
  final items = asMapList(body['items']);

  final total = items.fold<double>(
    0,
    (sum, item) => sum + asInt(item['quantity']) * asDouble(item['unitPrice']),
  );

  return {
    'items': [
      for (final item in items)
        {...item, 'receivedQuantity': asInt(item['receivedQuantity'])},
    ],
    'totalAmount': total,
  };
}

/// Pengeluaran kas (`/kas`).
final expensesConfig = CollectionConfig(
  path: 'expenses',
  title: 'Pengeluaran Kas',
  singular: 'Pengeluaran',
  icon: Icons.account_balance_wallet_outlined,
  titleField: 'description',
  subtitleField: 'category',
  filterField: 'category',
  sortDescendingBy: 'date',
  fields: const [
    CollectionField(
      name: 'description',
      label: 'Keterangan',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'category',
      label: 'Kategori',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('gaji', 'Gaji'),
        FieldOption('sewa', 'Sewa'),
        FieldOption('utilitas', 'Utilitas'),
        FieldOption('pembelian-obat', 'Pembelian Obat'),
        FieldOption('operasional', 'Operasional'),
        FieldOption('pemeliharaan', 'Pemeliharaan'),
        FieldOption('lainnya', 'Lainnya'),
      ],
    ),
    CollectionField(
      name: 'amount',
      label: 'Nominal',
      type: FieldType.currency,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'date',
      label: 'Tanggal',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'paymentMethod',
      label: 'Metode Pembayaran',
      type: FieldType.select,
      defaultValue: 'tunai',
      options: [
        FieldOption('tunai', 'Tunai'),
        FieldOption('transfer', 'Transfer'),
        FieldOption('qris', 'QRIS'),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Riwayat tutup kasir.
final cashierClosingsConfig = CollectionConfig(
  path: 'cashier-closings',
  title: 'Riwayat Tutup Kasir',
  singular: 'Tutup Kasir',
  icon: Icons.point_of_sale_outlined,
  titleField: 'cashierName',
  subtitleField: 'closingDate',
  sortDescendingBy: 'closingDate',
  canCreate: false,
  canEdit: false,
  fields: const [
    CollectionField(name: 'cashierName', label: 'Nama Kasir', searchable: true),
    CollectionField(
      name: 'closingDate',
      label: 'Tanggal Tutup',
      type: FieldType.date,
      showInList: true,
    ),
    CollectionField(
      name: 'systemCashTotal',
      label: 'Kas Sistem',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'cashExpenseTotal',
      label: 'Pengeluaran Tunai',
      type: FieldType.currency,
    ),
    CollectionField(
      name: 'expectedCashTotal',
      label: 'Kas Seharusnya',
      type: FieldType.currency,
      showInList: true,
    ),
    CollectionField(
      name: 'countedCashTotal',
      label: 'Kas Dihitung',
      type: FieldType.currency,
      showInList: true,
    ),
    CollectionField(
      name: 'difference',
      label: 'Selisih',
      type: FieldType.currency,
      showInList: true,
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Rujukan masuk/keluar (`/rujukan`).
final referralsConfig = CollectionConfig(
  path: 'referrals',
  title: 'Rujukan',
  singular: 'Rujukan',
  icon: Icons.share_outlined,
  titleField: 'patientName',
  subtitleField: 'facilityName',
  statusField: 'status',
  filterField: 'direction',
  sortDescendingBy: 'createdAt',
  fields: const [
    _patientReference,
    _patientNameField,
    CollectionField(
      name: 'direction',
      label: 'Arah Rujukan',
      type: FieldType.select,
      required: true,
      defaultValue: 'outgoing',
      options: [
        FieldOption('outgoing', 'Rujukan Keluar'),
        FieldOption('incoming', 'Rujukan Masuk'),
      ],
    ),
    CollectionField(
      name: 'facilityName',
      label: 'Fasilitas Tujuan/Asal',
      required: true,
      searchable: true,
    ),
    CollectionField(name: 'facilityId', label: 'ID Fasilitas'),
    CollectionField(name: 'doctorName', label: 'Dokter Perujuk'),
    CollectionField(name: 'diagnosis', label: 'Diagnosis', searchable: true),
    CollectionField(
      name: 'reason',
      label: 'Alasan Rujukan',
      type: FieldType.multiline,
      required: true,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'draft',
      options: [
        FieldOption('draft', 'Draft'),
        FieldOption('sent', 'Dikirim'),
        FieldOption('received', 'Diterima'),
        FieldOption('followed-up', 'Ditindaklanjuti'),
        FieldOption('rejected', 'Ditolak'),
        FieldOption('completed', 'Selesai'),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Direktori fasilitas rujukan.
final referralFacilitiesConfig = CollectionConfig(
  path: 'referral-facilities',
  title: 'Fasilitas Rujukan',
  singular: 'Fasilitas',
  icon: Icons.local_hospital_outlined,
  titleField: 'name',
  subtitleField: 'address',
  filterField: 'type',
  fields: const [
    CollectionField(
      name: 'name',
      label: 'Nama Fasilitas',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'type',
      label: 'Jenis',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('rumah-sakit', 'Rumah Sakit'),
        FieldOption('klinik', 'Klinik'),
        FieldOption('puskesmas', 'Puskesmas'),
        FieldOption('lainnya', 'Lainnya'),
      ],
    ),
    CollectionField(
      name: 'address',
      label: 'Alamat',
      type: FieldType.multiline,
      searchable: true,
    ),
    CollectionField(
      name: 'phone',
      label: 'Telepon',
      type: FieldType.phone,
      showInList: true,
    ),
    CollectionField(name: 'notes', label: 'Catatan', type: FieldType.multiline),
  ],
);

/// Informed consent (`/persetujuan-tindakan`).
final informedConsentsConfig = CollectionConfig(
  path: 'informed-consents',
  title: 'Persetujuan Tindakan',
  singular: 'Persetujuan',
  icon: Icons.fact_check_outlined,
  titleField: 'patientName',
  subtitleField: 'procedureName',
  statusField: 'status',
  filterField: 'consentType',
  sortDescendingBy: 'createdAt',
  fields: const [
    _patientReference,
    _patientNameField,
    CollectionField(
      name: 'consentType',
      label: 'Jenis Persetujuan',
      type: FieldType.select,
      required: true,
      options: [
        FieldOption('tindakan-medis', 'Tindakan Medis'),
        FieldOption('tindakan-bedah', 'Tindakan Bedah'),
        FieldOption('anestesi', 'Anestesi'),
        FieldOption('rawat-inap', 'Rawat Inap'),
        FieldOption('transfusi-darah', 'Transfusi Darah'),
        FieldOption('persetujuan-umum', 'Persetujuan Umum'),
      ],
    ),
    CollectionField(
      name: 'procedureName',
      label: 'Nama Tindakan',
      required: true,
      searchable: true,
    ),
    CollectionField(name: 'doctorName', label: 'Dokter Pelaksana'),
    CollectionField(name: 'diagnosis', label: 'Diagnosis'),
    CollectionField(
      name: 'indication',
      label: 'Indikasi',
      type: FieldType.multiline,
    ),
    CollectionField(name: 'risks', label: 'Risiko', type: FieldType.multiline),
    CollectionField(
      name: 'alternatives',
      label: 'Alternatif Tindakan',
      type: FieldType.multiline,
    ),
    CollectionField(
      name: 'prognosis',
      label: 'Prognosis',
      type: FieldType.multiline,
    ),
    CollectionField(
      name: 'grantedBy',
      label: 'Pemberi Persetujuan',
      type: FieldType.select,
      required: true,
      defaultValue: 'pasien',
      options: [
        FieldOption('pasien', 'Pasien'),
        FieldOption('wali', 'Wali'),
      ],
    ),
    CollectionField(name: 'guardianName', label: 'Nama Wali'),
    CollectionField(name: 'guardianRelation', label: 'Hubungan dengan Pasien'),
    CollectionField(name: 'witnessName', label: 'Nama Saksi'),
    CollectionField(
      name: 'decision',
      label: 'Keputusan',
      type: FieldType.select,
      required: true,
      defaultValue: 'setuju',
      options: [
        FieldOption('setuju', 'Setuju'),
        FieldOption('menolak', 'Menolak'),
      ],
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      defaultValue: 'draft',
      options: [
        FieldOption('draft', 'Draft'),
        FieldOption('signed', 'Ditandatangani'),
      ],
    ),
  ],
);

/// Pengingat & notifikasi pasien (`/komunikasi`).
final patientNotificationsConfig = CollectionConfig(
  path: 'patient-notifications',
  title: 'Pengingat Pasien',
  singular: 'Pengingat',
  icon: Icons.chat_bubble_outline,
  titleField: 'patientName',
  subtitleField: 'message',
  statusField: 'status',
  filterField: 'channel',
  sortDescendingBy: 'targetAt',
  fields: const [
    _patientReference,
    _patientNameField,
    CollectionField(
      name: 'channel',
      label: 'Kanal',
      type: FieldType.select,
      required: true,
      defaultValue: 'whatsapp',
      options: [
        FieldOption('sms', 'SMS'),
        FieldOption('whatsapp', 'WhatsApp'),
        FieldOption('email', 'Email'),
      ],
    ),
    CollectionField(
      name: 'message',
      label: 'Isi Pesan',
      type: FieldType.multiline,
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'targetAt',
      label: 'Waktu Kirim',
      type: FieldType.date,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'status',
      label: 'Status',
      type: FieldType.select,
      readOnly: true,
      options: [
        FieldOption('pending', 'Menunggu'),
        FieldOption('processing', 'Diproses'),
        FieldOption('sent', 'Terkirim'),
        FieldOption('failed', 'Gagal'),
      ],
    ),
  ],
);

/// Survei kepuasan pasien.
final satisfactionSurveysConfig = CollectionConfig(
  path: 'satisfaction-surveys',
  title: 'Survei Kepuasan',
  singular: 'Survei',
  icon: Icons.star_outline,
  titleField: 'patientName',
  subtitleField: 'comments',
  sortDescendingBy: 'submittedAt',
  fields: const [
    _patientReference,
    _patientNameField,
    CollectionField(
      name: 'rating',
      label: 'Nilai (1-5)',
      type: FieldType.number,
      required: true,
      showInList: true,
    ),
    CollectionField(
      name: 'comments',
      label: 'Komentar',
      type: FieldType.multiline,
      searchable: true,
    ),
    CollectionField(
      name: 'submittedAt',
      label: 'Waktu Pengisian',
      type: FieldType.date,
      showInList: true,
    ),
  ],
);

/// Manajemen pengguna (`/pengguna`).
final usersConfig = CollectionConfig(
  path: 'users',
  title: 'Pengguna',
  singular: 'Pengguna',
  icon: Icons.manage_accounts_outlined,
  titleField: 'name',
  subtitleField: 'email',
  filterField: 'role',
  fields: const [
    CollectionField(
      name: 'name',
      label: 'Nama Lengkap',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'username',
      label: 'Username',
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'email',
      label: 'Email',
      type: FieldType.email,
      required: true,
      searchable: true,
    ),
    CollectionField(
      name: 'role',
      label: 'Peran',
      type: FieldType.select,
      required: true,
      defaultValue: 'umum',
      options: [
        FieldOption('admin', 'Administrator'),
        FieldOption('dokter', 'Dokter'),
        FieldOption('bidan', 'Bidan'),
        FieldOption('perawat', 'Perawat'),
        FieldOption('teknis', 'Tenaga Teknis'),
        FieldOption('umum', 'Staf Umum'),
      ],
      showInList: true,
    ),
    CollectionField(
      name: 'password',
      label: 'Password',
      helperText: 'Isi hanya bila ingin membuat akun baru atau mengganti password',
    ),
    CollectionField(
      name: 'createdAt',
      label: 'Dibuat',
      type: FieldType.date,
      readOnly: true,
    ),
  ],
);

/// Jejak audit perubahan data (`/audit-log`).
final auditLogsConfig = CollectionConfig(
  path: 'audit-logs',
  title: 'Riwayat Aktivitas',
  singular: 'Aktivitas',
  icon: Icons.history_outlined,
  titleField: 'collection',
  subtitleField: 'username',
  filterField: 'action',
  sortDescendingBy: 'createdAt',
  // Jejak audit bersifat hanya-baca demi menjaga keterlacakan.
  canCreate: false,
  canEdit: false,
  canDelete: false,
  fields: const [
    CollectionField(name: 'collection', label: 'Koleksi', searchable: true),
    CollectionField(name: 'itemId', label: 'ID Data', searchable: true),
    CollectionField(
      name: 'action',
      label: 'Aksi',
      type: FieldType.select,
      showInList: true,
      options: [
        FieldOption('create', 'Tambah'),
        FieldOption('update', 'Ubah'),
        FieldOption('delete', 'Hapus'),
        FieldOption('lock', 'Kunci'),
        FieldOption('status-change', 'Ubah Status'),
      ],
    ),
    CollectionField(name: 'username', label: 'Pengguna', searchable: true),
    CollectionField(name: 'role', label: 'Peran'),
    CollectionField(name: 'reason', label: 'Alasan'),
    CollectionField(
      name: 'createdAt',
      label: 'Waktu',
      type: FieldType.date,
      showInList: true,
    ),
  ],
);

/// Mutasi stok obat (`/kartu-stok`).
final stockMovementsConfig = CollectionConfig(
  path: 'medicines/stock-movements',
  title: 'Kartu Stok',
  singular: 'Mutasi Stok',
  icon: Icons.playlist_add_check_outlined,
  titleField: 'medicineName',
  subtitleField: 'notes',
  filterField: 'reason',
  sortDescendingBy: 'createdAt',
  // Mutasi stok dihasilkan sistem dari penyerahan resep, penerimaan barang,
  // dan stock opname — tidak boleh dikarang manual.
  canCreate: false,
  canEdit: false,
  canDelete: false,
  fields: const [
    CollectionField(name: 'medicineName', label: 'Nama Obat', searchable: true),
    CollectionField(name: 'medicineId', label: 'ID Obat'),
    CollectionField(name: 'batchNumber', label: 'Nomor Batch', searchable: true),
    CollectionField(
      name: 'quantityChange',
      label: 'Perubahan Stok',
      type: FieldType.number,
      showInList: true,
    ),
    CollectionField(
      name: 'reason',
      label: 'Alasan',
      type: FieldType.select,
      showInList: true,
      options: [
        FieldOption('dispense', 'Penyerahan Resep'),
        FieldOption('adjustment', 'Koreksi'),
        FieldOption('stock-opname', 'Stock Opname'),
        FieldOption('receipt', 'Penerimaan Barang'),
      ],
    ),
    CollectionField(name: 'notes', label: 'Catatan'),
    CollectionField(
      name: 'createdAt',
      label: 'Waktu',
      type: FieldType.date,
      showInList: true,
    ),
  ],
);
