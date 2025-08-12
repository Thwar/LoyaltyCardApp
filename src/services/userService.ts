import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { User } from "../types";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { handleFirestoreError, safeTimestampToDate } from "./utils";
import { AuthService } from "./authService";

export class UserService {
  static async updateUser(userId: string, userData: Partial<Pick<User, "displayName" | "profileImage">>): Promise<void> {
    try {
      const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, userId);
      await updateDoc(userRef, { ...userData, updatedAt: serverTimestamp() });
      if (userData.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: userData.displayName });
      }
    } catch (error) {
      throw new Error("Error al actualizar el perfil del usuario");
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, userId));
      if (!userDoc.exists()) return null;
      const userData = userDoc.data();
      const createdAt = safeTimestampToDate(userData.createdAt);
      return {
        id: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        userType: userData.userType,
        createdAt,
        profileImage: userData.profileImage,
        pushToken: userData.pushToken,
      };
    } catch (error: any) {
      handleFirestoreError(error, "obtener usuario");
      return null;
    }
  }

  static async updatePushToken(pushToken: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");
      const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, currentUser.uid);
      await updateDoc(userRef, { pushToken, pushTokenUpdatedAt: new Date() });
    } catch (error) {
      throw new Error("Error al actualizar el token de notificaciones");
    }
  }

  // Back-compat: some screens call UserService.deleteAccount()
  static async deleteAccount(): Promise<void> {
    return AuthService.deleteAccount();
  }

  // Convenience: reauthenticate current user with password
  static async reauthenticateWithPassword(password: string): Promise<void> {
    return AuthService.reauthenticateWithPassword(password);
  }

  // Convenience: delete account by first reauthenticating with password
  static async deleteAccountWithPassword(password: string): Promise<void> {
    return AuthService.deleteAccountWithPassword(password);
  }
}

export default UserService;
