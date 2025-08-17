import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { User } from "../types";
import EmailService from "./emailService";
import { SSOService } from "./ssoService";
import { safeTimestampToDate } from "./utils";

export class AuthService {
  static async register(email: string, password: string, displayName: string, userType: "customer" | "business"): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName });

      const userData: Omit<User, "id"> = {
        email,
        displayName,
        userType,
        createdAt: new Date(),
      };

      await setDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid), {
        email,
        displayName,
        userType,
        createdAt: serverTimestamp(),
      });

      await new Promise((r) => setTimeout(r, 100));

      EmailService.sendWelcomeEmail({ email, displayName, userType }).catch(() => {});

      return { id: firebaseUser.uid, ...userData };
    } catch (error: any) {
      let errorMessage = "Registro fallido";
      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage = "Esta dirección de correo electrónico ya está registrada. Por favor usa un correo diferente o intenta iniciar sesión.";
            break;
          case "auth/invalid-email":
            errorMessage = "Por favor ingresa una dirección de correo electrónico válida.";
            break;
          case "auth/operation-not-allowed":
            errorMessage = "Las cuentas de correo/contraseña no están habilitadas. Por favor contacta soporte.";
            break;
          case "auth/weak-password":
            errorMessage = "La contraseña es muy débil. Por favor elige una contraseña más fuerte.";
            break;
          case "auth/network-request-failed":
            errorMessage = "Error de red. Por favor verifica tu conexión a internet e intenta de nuevo.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Demasiados intentos fallidos. Por favor intenta más tarde.";
            break;
          case "auth/api-key-not-valid":
            errorMessage = "Configuración de API inválida. Por favor contacta soporte.";
            break;
          default:
            errorMessage = error.message || "Registro fallido";
        }
      } else {
        errorMessage = error.message || "Registro fallido";
      }
      throw new Error(errorMessage);
    }
  }

  static async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("Datos de usuario no encontrados");
      }
      const userData = userDoc.data();
      const createdAt = safeTimestampToDate(userData.createdAt);
      return {
        id: firebaseUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        userType: userData.userType,
        createdAt,
        profileImage: userData.profileImage,
      };
    } catch (error: any) {
      try {
        await signOut(auth);
      } catch {}
      let errorMessage = "Inicio de sesión fallido";
      if (error.code) {
        switch (error.code) {
          case "auth/invalid-credential":
            errorMessage = "Credenciales inválidas. Por favor verifica tu correo electrónico y contraseña.";
            break;
          case "auth/user-not-found":
            errorMessage = "No se encontró una cuenta con esta dirección de correo electrónico. Por favor verifica tu correo o registra una nueva cuenta.";
            break;
          case "auth/wrong-password":
            errorMessage = "Contraseña incorrecta. Por favor intenta de nuevo.";
            break;
          case "auth/invalid-email":
            errorMessage = "Por favor ingresa una dirección de correo electrónico válida.";
            break;
          case "auth/user-disabled":
            errorMessage = "Esta cuenta ha sido deshabilitada. Por favor contacta soporte.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Demasiados intentos fallidos. Por favor intenta más tarde.";
            break;
          case "auth/network-request-failed":
            errorMessage = "Error de red. Por favor verifica tu conexión a internet e intenta de nuevo.";
            break;
          case "auth/internal-error":
            errorMessage = "Error interno del servidor. Por favor intenta más tarde.";
            break;
          case "auth/popup-closed-by-user":
          case "auth/cancelled-popup-request":
            errorMessage = "Proceso de autenticación cancelado.";
            break;
          default:
            errorMessage = error.message || "Inicio de sesión fallido";
        }
      } else {
        errorMessage = error.message || "Inicio de sesión fallido";
      }
      throw new Error(errorMessage);
    }
  }

  static async logout(): Promise<void> {
    try {
      // Sign out from all providers
      await Promise.all([
        signOut(auth),
        SSOService.signOutGoogle(),
        // For Facebook logout, we'll handle it in the UI layer since it requires different handling
      ]);
    } catch (error) {
      console.error("Error during logout:", error);
      // Force sign out from Firebase even if SSO logout fails
      await signOut(auth);
    }
  }

  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  static async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    try {
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));
      if (!userDoc.exists()) return null;
      const userData = userDoc.data();
      const createdAt = safeTimestampToDate(userData.createdAt);
      return {
        id: firebaseUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        userType: userData.userType,
        createdAt,
        profileImage: userData.profileImage,
      };
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  static async signInWithGoogle(isRegistering: boolean = false): Promise<User> {
    try {
      const userCredential = await SSOService.signInWithGoogle();
      const firebaseUser = userCredential.user;
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const createdAt = safeTimestampToDate(userData.createdAt);
        return { id: firebaseUser.uid, email: userData.email, displayName: userData.displayName, userType: userData.userType, createdAt, profileImage: userData.profileImage };
      } else {
        if (isRegistering) {
          const userData: Omit<User, "id"> = {
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            userType: "customer",
            createdAt: new Date(),
            profileImage: firebaseUser.photoURL || undefined,
          };
          await setDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid), {
            email: userData.email,
            displayName: userData.displayName,
            userType: userData.userType,
            createdAt: serverTimestamp(),
            profileImage: userData.profileImage,
          });
          await new Promise((r) => setTimeout(r, 100));
          EmailService.sendWelcomeEmail({ email: userData.email, displayName: userData.displayName, userType: userData.userType }).catch(() => {});
          return { id: firebaseUser.uid, ...userData };
        } else {
          await signOut(auth);
          await SSOService.signOutGoogle();
          throw new Error("La cuenta no existe. Por favor, regístrese primero.");
        }
      }
    } catch (error: any) {
      try {
        await signOut(auth);
        await SSOService.signOutGoogle();
      } catch {}
      throw new Error(error.message || "Error al iniciar sesión con Google");
    }
  }

  static async signInWithFacebook(isRegistering: boolean = false): Promise<User> {
    try {
      const userCredentialWithProfile = await SSOService.signInWithFacebook();
      const firebaseUser = userCredentialWithProfile.user;
      const facebookProfile = (userCredentialWithProfile as any).facebookProfile;

      console.log("Facebook sign-in completed:", {
        firebaseEmail: firebaseUser.email,
        firebaseDisplayName: firebaseUser.displayName,
        facebookEmail: facebookProfile?.email,
        facebookName: facebookProfile?.name,
      });

      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const createdAt = safeTimestampToDate(userData.createdAt);
        return {
          id: firebaseUser.uid,
          email: userData.email,
          displayName: userData.displayName,
          userType: userData.userType,
          createdAt,
          profileImage: userData.profileImage,
        };
      } else {
        if (isRegistering) {
          // Use Facebook profile data as fallback if Firebase user doesn't have the info
          const email = firebaseUser.email || facebookProfile?.email || "";
          const displayName = firebaseUser.displayName || facebookProfile?.name || "";
          const profileImage = firebaseUser.photoURL || facebookProfile?.picture || undefined;

          console.log("Creating new user with Facebook data:", {
            email,
            displayName,
            hasProfileImage: !!profileImage,
            emailSource: firebaseUser.email ? "firebase" : facebookProfile?.email ? "facebook" : "none",
          });

          // Check if we have at least a display name (email is optional for Facebook users)
          if (!displayName) {
            console.error("Missing required display name:", { email, displayName });
            await signOut(auth);
            throw new Error("No se pudo obtener el nombre del perfil de Facebook. Por favor intenta de nuevo.");
          }

          // For Facebook users without email, we'll use a placeholder email or generate one
          let finalEmail = email;
          if (!finalEmail) {
            // Generate a placeholder email using the Firebase UID
            finalEmail = `facebook_${firebaseUser.uid}@placeholder.local`;
            console.log("Generated placeholder email for Facebook user without email:", finalEmail);
          }

          const userData: Omit<User, "id"> = {
            email: finalEmail,
            displayName,
            userType: "customer",
            createdAt: new Date(),
            profileImage,
          };

          await setDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid), {
            email: userData.email,
            displayName: userData.displayName,
            userType: userData.userType,
            createdAt: serverTimestamp(),
            profileImage: userData.profileImage,
          });

          // Send welcome email only if we have a real email address
          if (email && !email.includes("@placeholder.local")) {
            EmailService.sendWelcomeEmail({
              email: userData.email,
              displayName: userData.displayName,
              userType: userData.userType,
            }).catch((emailError) => {
              console.error("Failed to send welcome email:", emailError);
            });
          } else {
            console.log("Skipping welcome email for Facebook user without email");
          }

          return { id: firebaseUser.uid, ...userData };
        } else {
          await signOut(auth);
          throw new Error("La cuenta no existe. Por favor, regístrese primero.");
        }
      }
    } catch (error: any) {
      try {
        await signOut(auth);
      } catch {}
      throw new Error(error.message || "Error al iniciar sesión con Facebook");
    }
  }

  static async deleteAccount(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Usuario no autenticado");
    const userId = currentUser.uid;

    try {
      // Attempt to delete the Auth user first; if recent login is required, surface a clear signal
      await deleteUser(currentUser);
    } catch (err: any) {
      if (err?.code === "auth/requires-recent-login") {
        // Signal the UI to prompt for password and call deleteAccountWithPassword
        const e = new Error("AUTH_REQUIRES_RECENT_LOGIN");
        // @ts-expect-error attach code for consumers who inspect it
        e.code = "AUTH_REQUIRES_RECENT_LOGIN";
        throw e;
      }
      throw err;
    }

    // Best-effort cleanup of the Firestore user document (ignore failures)
    try {
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.USERS, userId));
    } catch (e) {
      console.warn("Failed to delete Firestore user document after auth deletion", e);
    }
  }

  // Reauthenticate the current user with password
  static async reauthenticateWithPassword(password: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) throw new Error("Usuario no autenticado");
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
  }

  // Full delete flow with reauth: reauthenticate, delete Firestore user document, then delete Auth user
  static async deleteAccountWithPassword(password: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Usuario no autenticado");
    const userId = currentUser.uid;
    await this.reauthenticateWithPassword(password);
    // Delete Firestore user first while session is valid, then Auth user
    await deleteDoc(doc(db, FIREBASE_COLLECTIONS.USERS, userId));
    await deleteUser(currentUser);
  }
}

export default AuthService;
