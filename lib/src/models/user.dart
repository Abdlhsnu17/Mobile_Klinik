import '../core/utils/json_utils.dart';

/// Peran pengguna, selaras dengan `USER_ROLES` di `packages/types`.
enum UserRole {
  admin('admin', 'Administrator'),
  dokter('dokter', 'Dokter'),
  bidan('bidan', 'Bidan'),
  perawat('perawat', 'Perawat'),
  teknis('teknis', 'Tenaga Teknis'),
  umum('umum', 'Staf Umum');

  const UserRole(this.value, this.label);

  final String value;
  final String label;

  static UserRole? tryParse(String? value) {
    if (value == null) return null;
    for (final role in UserRole.values) {
      if (role.value == value) return role;
    }
    return null;
  }

  static UserRole parse(String? value) => tryParse(value) ?? UserRole.umum;
}

/// Profil pengguna tanpa password (padanan `SafeUser` di frontend Next.js).
class AppUser {
  const AppUser({
    required this.id,
    required this.username,
    required this.name,
    required this.email,
    required this.role,
    this.avatarUrl,
    this.createdAt,
  });

  final String id;
  final String username;
  final String name;
  final String email;
  final UserRole role;
  final String? avatarUrl;
  final String? createdAt;

  bool get isAdmin => role == UserRole.admin;

  /// Inisial untuk avatar fallback, mis. "Budi Santoso" -> "BS".
  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return username.isEmpty ? '?' : username[0].toUpperCase();
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: asString(json['id']),
        username: asString(json['username']),
        name: asString(json['name']),
        email: asString(json['email']),
        role: UserRole.parse(asStringOrNull(json['role'])),
        // Backend memakai `avatarUrl`; sebagian respons lama memakai `avatar`.
        avatarUrl: asStringOrNull(json['avatarUrl']) ??
            asStringOrNull(json['avatar']),
        createdAt: asStringOrNull(json['createdAt']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'name': name,
        'email': email,
        'role': role.value,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        if (createdAt != null) 'createdAt': createdAt,
      };

  AppUser copyWith({String? name, String? email, String? avatarUrl}) => AppUser(
        id: id,
        username: username,
        name: name ?? this.name,
        email: email ?? this.email,
        role: role,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        createdAt: createdAt,
      );
}
