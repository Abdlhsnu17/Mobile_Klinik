import '../core/utils/json_utils.dart';

/// Model domain klinik yang dipakai layar dengan logika khusus (antrian,
/// pemeriksaan, farmasi, dashboard). Modul CRUD generik bekerja langsung di
/// atas `Map<String, dynamic>` sehingga tidak memerlukan kelas tersendiri.

class Patient {
  const Patient({
    required this.id,
    required this.noRM,
    required this.nik,
    required this.name,
    required this.birthDate,
    required this.gender,
    required this.address,
    required this.phone,
    this.email,
    this.bloodType,
    this.allergies,
    this.emergencyContact,
    this.emergencyPhone,
  });

  final String id;
  final String noRM;
  final String nik;
  final String name;
  final String birthDate;
  final String gender;
  final String address;
  final String phone;
  final String? email;
  final String? bloodType;
  final String? allergies;
  final String? emergencyContact;
  final String? emergencyPhone;

  /// Umur dalam tahun penuh, null bila tanggal lahir tidak terbaca.
  int? get age {
    final born = DateTime.tryParse(birthDate);
    if (born == null) return null;

    final today = DateTime.now();
    var years = today.year - born.year;
    final hadBirthdayThisYear = today.month > born.month ||
        (today.month == born.month && today.day >= born.day);
    if (!hadBirthdayThisYear) years -= 1;
    return years < 0 ? null : years;
  }

  bool get hasAllergy => (allergies ?? '').trim().isNotEmpty;

  factory Patient.fromJson(Map<String, dynamic> json) => Patient(
        id: asString(json['id']),
        noRM: asString(json['noRM']),
        nik: asString(json['nik']),
        name: asString(json['name']),
        birthDate: asString(json['birthDate']),
        gender: asString(json['gender']),
        address: asString(json['address']),
        phone: asString(json['phone']),
        email: asStringOrNull(json['email']),
        bloodType: asStringOrNull(json['bloodType']),
        allergies: asStringOrNull(json['allergies']),
        emergencyContact: asStringOrNull(json['emergencyContact']),
        emergencyPhone: asStringOrNull(json['emergencyPhone']),
      );
}

class DoctorSchedule {
  const DoctorSchedule({
    required this.day,
    required this.startTime,
    required this.endTime,
  });

  final String day;
  final String startTime;
  final String endTime;

  factory DoctorSchedule.fromJson(Map<String, dynamic> json) => DoctorSchedule(
        day: asString(json['day']),
        startTime: asString(json['startTime']),
        endTime: asString(json['endTime']),
      );

  Map<String, dynamic> toJson() => {
        'day': day,
        'startTime': startTime,
        'endTime': endTime,
      };

  @override
  String toString() => '$day $startTime–$endTime';
}

class Doctor {
  const Doctor({
    required this.id,
    required this.name,
    required this.specialization,
    required this.phone,
    required this.email,
    required this.status,
    this.schedules = const [],
  });

  final String id;
  final String name;
  final String specialization;
  final String phone;
  final String email;
  final String status;
  final List<DoctorSchedule> schedules;

  bool get isActive => status == 'Aktif';

  factory Doctor.fromJson(Map<String, dynamic> json) => Doctor(
        id: asString(json['id']),
        name: asString(json['name']),
        specialization: asString(json['specialization']),
        phone: asString(json['phone']),
        email: asString(json['email']),
        status: asString(json['status'], fallback: 'Aktif'),
        schedules: asModelList(json['schedules'], DoctorSchedule.fromJson),
      );
}

class ClinicService {
  const ClinicService({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.duration,
    required this.status,
    this.description = '',
    this.applicableSpecializations = const [],
  });

  final String id;
  final String name;
  final String category;
  final double price;
  final int duration;
  final String status;
  final String description;
  final List<String> applicableSpecializations;

  bool get isActive => status == 'Aktif';

  /// Layanan tanpa daftar spesialisasi berlaku untuk semua dokter.
  bool matchesSpecialization(String? specialization) {
    if (applicableSpecializations.isEmpty) return true;
    if (specialization == null) return true;
    return applicableSpecializations.contains(specialization);
  }

  factory ClinicService.fromJson(Map<String, dynamic> json) => ClinicService(
        id: asString(json['id']),
        name: asString(json['name']),
        category: asString(json['category']),
        price: asDouble(json['price']),
        duration: asInt(json['duration']),
        status: asString(json['status'], fallback: 'Aktif'),
        description: asString(json['description']),
        applicableSpecializations:
            asStringList(json['applicableSpecializations']),
      );
}

/// Status antrian kunjungan, selaras dengan `APPOINTMENT_STATUSES`.
enum AppointmentStatus {
  menunggu('Menunggu'),
  dipanggil('Dipanggil'),
  diperiksa('Diperiksa'),
  selesai('Selesai'),
  batal('Batal');

  const AppointmentStatus(this.value);

  final String value;

  String get label => value;

  static AppointmentStatus parse(String? value) {
    for (final status in AppointmentStatus.values) {
      if (status.value == value) return status;
    }
    return AppointmentStatus.menunggu;
  }
}

class VitalSigns {
  const VitalSigns({
    this.bloodPressure,
    this.heartRate,
    this.temperature,
    this.bloodGlucose,
    this.oxygenSaturation,
    this.weight,
    this.height,
    this.respiratoryRate,
  });

  final String? bloodPressure;
  final String? heartRate;
  final String? temperature;
  final String? bloodGlucose;
  final String? oxygenSaturation;
  final String? weight;
  final String? height;
  final String? respiratoryRate;

  bool get isEmpty =>
      [
        bloodPressure,
        heartRate,
        temperature,
        bloodGlucose,
        oxygenSaturation,
        weight,
        height,
        respiratoryRate,
      ].every((value) => value == null || value.isEmpty);

  factory VitalSigns.fromJson(Map<String, dynamic> json) => VitalSigns(
        bloodPressure: asStringOrNull(json['bloodPressure']),
        heartRate: asStringOrNull(json['heartRate']),
        temperature: asStringOrNull(json['temperature']),
        bloodGlucose: asStringOrNull(json['bloodGlucose']),
        oxygenSaturation: asStringOrNull(json['oxygenSaturation']),
        weight: asStringOrNull(json['weight']),
        height: asStringOrNull(json['height']),
        respiratoryRate: asStringOrNull(json['respiratoryRate']),
      );

  Map<String, dynamic> toJson() => compactJson({
        'bloodPressure': bloodPressure,
        'heartRate': heartRate,
        'temperature': temperature,
        'bloodGlucose': bloodGlucose,
        'oxygenSaturation': oxygenSaturation,
        'weight': weight,
        'height': height,
        'respiratoryRate': respiratoryRate,
      });
}

class NursingTriage {
  const NursingTriage({
    required this.vitalSigns,
    required this.recordedAt,
    this.complaints,
    this.notes,
    this.nurseName,
  });

  final VitalSigns vitalSigns;
  final String recordedAt;
  final String? complaints;
  final String? notes;
  final String? nurseName;

  factory NursingTriage.fromJson(Map<String, dynamic> json) => NursingTriage(
        vitalSigns: VitalSigns.fromJson(asMap(json['vitalSigns'])),
        recordedAt: asString(json['recordedAt']),
        complaints: asStringOrNull(json['complaints']),
        notes: asStringOrNull(json['notes']),
        nurseName: asStringOrNull(json['nurseName']),
      );

  Map<String, dynamic> toJson() => compactJson({
        'vitalSigns': vitalSigns.toJson(),
        'recordedAt': recordedAt,
        'complaints': complaints,
        'notes': notes,
        'nurseName': nurseName,
      });
}

class Appointment {
  const Appointment({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.doctorId,
    required this.doctorName,
    required this.serviceId,
    required this.serviceName,
    required this.date,
    required this.time,
    required this.status,
    required this.queueNumber,
    this.serviceIds = const [],
    this.serviceNames = const [],
    this.notes,
    this.triage,
  });

  final String id;
  final String patientId;
  final String patientName;
  final String doctorId;
  final String doctorName;
  final String serviceId;
  final String serviceName;
  final String date;
  final String time;
  final AppointmentStatus status;
  final int queueNumber;
  final List<String> serviceIds;
  final List<String> serviceNames;
  final String? notes;
  final NursingTriage? triage;

  bool get hasTriage => triage != null;

  /// Layanan yang ditampilkan: daftar multi-layanan bila tersedia, selain itu
  /// jatuh kembali ke field tunggal warisan.
  List<String> get displayServices =>
      serviceNames.isNotEmpty ? serviceNames : [if (serviceName.isNotEmpty) serviceName];

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        id: asString(json['id']),
        patientId: asString(json['patientId']),
        patientName: asString(json['patientName']),
        doctorId: asString(json['doctorId']),
        doctorName: asString(json['doctorName']),
        serviceId: asString(json['serviceId']),
        serviceName: asString(json['serviceName']),
        date: asString(json['date']),
        time: asString(json['time']),
        status: AppointmentStatus.parse(asStringOrNull(json['status'])),
        queueNumber: asInt(json['queueNumber']),
        serviceIds: asStringList(json['serviceIds']),
        serviceNames: asStringList(json['serviceNames']),
        notes: asStringOrNull(json['notes']),
        triage: json['triage'] == null
            ? null
            : NursingTriage.fromJson(asMap(json['triage'])),
      );
}

class Medicine {
  const Medicine({
    required this.id,
    required this.code,
    required this.name,
    required this.genericName,
    required this.category,
    required this.form,
    required this.unit,
    required this.stock,
    required this.minStock,
    required this.price,
    required this.manufacturer,
    required this.expiryDate,
    required this.status,
  });

  final String id;
  final String code;
  final String name;
  final String genericName;
  final String category;
  final String form;
  final String unit;
  final int stock;
  final int minStock;
  final double price;
  final String manufacturer;
  final String expiryDate;
  final String status;

  bool get isOutOfStock => stock <= 0;
  bool get isLowStock => stock > 0 && stock <= minStock;

  /// Sisa hari menuju kedaluwarsa; negatif berarti sudah lewat.
  int? get daysUntilExpiry {
    final expiry = DateTime.tryParse(expiryDate);
    if (expiry == null) return null;
    final today = DateTime.now();
    return DateTime(expiry.year, expiry.month, expiry.day)
        .difference(DateTime(today.year, today.month, today.day))
        .inDays;
  }

  factory Medicine.fromJson(Map<String, dynamic> json) => Medicine(
        id: asString(json['id']),
        code: asString(json['code']),
        name: asString(json['name']),
        genericName: asString(json['genericName']),
        category: asString(json['category']),
        form: asString(json['form']),
        unit: asString(json['unit'], fallback: 'pcs'),
        stock: asInt(json['stock']),
        minStock: asInt(json['minStock']),
        price: asDouble(json['price']) == 0
            ? asDouble(json['sellPrice'])
            : asDouble(json['price']),
        manufacturer: asString(json['manufacturer']),
        expiryDate: asString(json['expiryDate']),
        status: asString(json['status']),
      );
}

class Prescription {
  const Prescription({
    required this.medicineId,
    required this.medicineName,
    required this.dosage,
    required this.frequency,
    required this.duration,
    required this.quantity,
    this.notes,
  });

  final String medicineId;
  final String medicineName;
  final String dosage;
  final String frequency;
  final String duration;
  final int quantity;
  final String? notes;

  factory Prescription.fromJson(Map<String, dynamic> json) => Prescription(
        medicineId: asString(json['medicineId']),
        medicineName: asString(json['medicineName']),
        dosage: asString(json['dosage']),
        frequency: asString(json['frequency']),
        duration: asString(json['duration']),
        quantity: asInt(json['quantity']),
        notes: asStringOrNull(json['notes']),
      );

  Map<String, dynamic> toJson() => compactJson({
        'medicineId': medicineId,
        'medicineName': medicineName,
        'dosage': dosage,
        'frequency': frequency,
        'duration': duration,
        'quantity': quantity,
        'notes': notes,
      });
}

class SoapNote {
  const SoapNote({this.subjective, this.objective, this.assessment, this.plan});

  final String? subjective;
  final String? objective;
  final String? assessment;
  final String? plan;

  factory SoapNote.fromJson(Map<String, dynamic> json) => SoapNote(
        subjective: asStringOrNull(json['subjective']),
        objective: asStringOrNull(json['objective']),
        assessment: asStringOrNull(json['assessment']),
        plan: asStringOrNull(json['plan']),
      );

  Map<String, dynamic> toJson() => compactJson({
        'subjective': subjective,
        'objective': objective,
        'assessment': assessment,
        'plan': plan,
      });
}

class MedicalRecord {
  const MedicalRecord({
    required this.id,
    required this.patientId,
    required this.appointmentId,
    required this.doctorId,
    required this.doctorName,
    required this.date,
    required this.diagnosis,
    required this.symptoms,
    required this.treatment,
    this.soap,
    this.vitalSigns,
    this.prescription = const [],
    this.clinicalDecision,
    this.status,
    this.notes,
  });

  final String id;
  final String patientId;
  final String appointmentId;
  final String doctorId;
  final String doctorName;
  final String date;
  final String diagnosis;
  final String symptoms;
  final String treatment;
  final SoapNote? soap;
  final VitalSigns? vitalSigns;
  final List<Prescription> prescription;
  final String? clinicalDecision;
  final String? status;
  final String? notes;

  /// Rekam medis terkunci tidak boleh diubah lagi (kepatuhan rekam medis).
  bool get isLocked => status == 'locked';

  factory MedicalRecord.fromJson(Map<String, dynamic> json) => MedicalRecord(
        id: asString(json['id']),
        patientId: asString(json['patientId']),
        appointmentId: asString(json['appointmentId']),
        doctorId: asString(json['doctorId']),
        doctorName: asString(json['doctorName']),
        date: asString(json['date']),
        diagnosis: asString(json['diagnosis']),
        symptoms: asString(json['symptoms']),
        treatment: asString(json['treatment']),
        soap: json['soap'] == null ? null : SoapNote.fromJson(asMap(json['soap'])),
        vitalSigns: json['vitalSigns'] == null
            ? null
            : VitalSigns.fromJson(asMap(json['vitalSigns'])),
        prescription: asModelList(json['prescription'], Prescription.fromJson),
        clinicalDecision: asStringOrNull(json['clinicalDecision']),
        status: asStringOrNull(json['status']),
        notes: asStringOrNull(json['notes']),
      );
}
