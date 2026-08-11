import type { User } from "../types";
import { AuthService } from "./authService";
import { createHttpError } from "../utils/httpError";

export async function updateAvatar(userId: string, avatarFilePath: string): Promise<User> {
  const urlPath = avatarFilePath.replace(/\\/g, '/').split('/uploads/').pop();
  const avatarUrl = `/uploads/${urlPath}`;

  const updatedUser = await AuthService.updateUser(userId, { avatarUrl });
  if (!updatedUser) {
    throw createHttpError(500, "Gagal memperbarui data pengguna setelah unggah avatar.");
  }

  return updatedUser;
}
