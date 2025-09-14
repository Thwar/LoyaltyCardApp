import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { User } from "../types";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { handleFirestoreError, safeTimestampToDate } from "./utils";
import { AuthService } from "./authService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export class UserService {
  private static DEVICE_ID_KEY = "caseroapp_device_id";

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

  // Get or create a persistent device identifier used for multi-device session control
  static async getOrCreateDeviceId(): Promise<string> {
    try {
      const existing = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      if (existing) return existing;
      // Lazy-load uuid to avoid increasing bundle during init
      const { v4: uuidv4 } = require("react-native-uuid");
      const newId = (uuidv4 && typeof uuidv4 === "function" ? uuidv4() : String(Date.now())) as string;
      await AsyncStorage.setItem(this.DEVICE_ID_KEY, newId);
      return newId;
    } catch (e) {
      console.warn("Fallo al obtener/crear deviceId, usando fallback", e);
      return `device_${Date.now()}`;
    }
  }

  // Force all other devices to logout by bumping a sessionVersion on the user document
  // The current device remains logged in; other devices detect the bump and sign out
  static async logoutAllDevicesExceptCurrent(): Promise<void> {
    try {
      const current = auth.currentUser;
      if (!current) throw new Error("Usuario no autenticado");
      const uid = current.uid;
      const deviceId = await this.getOrCreateDeviceId();
      const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, uid);

      // Ensure the doc exists before update; if missing, this will fail gracefully
      const snap = await getDoc(userRef);
      if (!snap.exists()) throw new Error("Datos de usuario no encontrados");

      // Increment sessionVersion (server-side) and mark initiator device
      // Using Firestore increment to avoid race conditions
      await updateDoc(userRef, {
        sessionVersion: increment(1),
        lastInitiatorDeviceId: deviceId,
        forcedLogoutAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Store the latest sessionVersion locally once we know it got bumped
      // Read back minimal to capture the new version
      try {
        const updated = await getDoc(userRef);
        const newVersion = (updated.data()?.sessionVersion as number) || 0;
        await AsyncStorage.setItem(this.sessionVersionKey(uid), String(newVersion));
      } catch (readBackErr) {
        // Non-fatal
        console.warn("No se pudo leer la nueva sessionVersion", readBackErr);
      }
    } catch (error: any) {
      const msg = error?.message || "No se pudo cerrar sesión en los otros dispositivos";
      throw new Error(msg);
    }
  }

  // Helpers to manage local session version state per user
  static sessionVersionKey(uid: string) {
    return `caseroapp_session_version_${uid}`;
  }
  static async getLocalSessionVersion(uid: string): Promise<number> {
    const raw = await AsyncStorage.getItem(this.sessionVersionKey(uid));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }
  static async setLocalSessionVersion(uid: string, version: number): Promise<void> {
    await AsyncStorage.setItem(this.sessionVersionKey(uid), String(version));
  }
}

export default UserService;
