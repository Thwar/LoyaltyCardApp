import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, User as FirebaseUser, UserCredential } from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { User, Business, LoyaltyCard, CustomerCard, Stamp, Reward, StampActivity } from "../types";
import EmailService from "./emailService";
import { SSOService } from "./ssoService";

// Auth Service
export class AuthService {
  static async register(email: string, password: string, displayName: string, userType: "customer" | "business"): Promise<User> {
    try {
      console.log("Starting registration for:", email);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      console.log("User created successfully:", firebaseUser.uid);

      // Update Firebase user profile
      await updateProfile(firebaseUser, { displayName });

      // Create user document in Firestore
      const userData: Omit<User, "id"> = {
        email,
        displayName,
        userType,
        createdAt: new Date(),
      };

      await setDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid), userData);

      // Send welcome email in background (don't block registration if email fails)
      EmailService.sendWelcomeEmail({
        email,
        displayName,
        userType,
      }).catch((error) => {
        console.error("Failed to send welcome email:", error);
        // Email failure should not affect registration success
      });

      return {
        id: firebaseUser.uid,
        ...userData,
      };
    } catch (error: any) {
      console.error("Registration error:", error); // Provide more specific error messages based on Firebase error codes
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
      console.log("Attempting Firebase signInWithEmailAndPassword for:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("Firebase auth successful, fetching user data from Firestore");

      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));
      if (!userDoc.exists()) {
        console.error("User document not found in Firestore, signing out");
        // Sign out since the user data is incomplete
        await signOut(auth);
        throw new Error("Datos de usuario no encontrados");
      }

      const userData = userDoc.data();
      console.log("User data retrieved successfully:", userData.email);
      return {
        id: firebaseUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        userType: userData.userType,
        createdAt: userData.createdAt.toDate(),
        profileImage: userData.profileImage,
      };
    } catch (error: any) {
      console.error("Login error:", error);

      // Ensure user is signed out on any login failure
      try {
        await signOut(auth);
        console.log("Signed out due to login error");
      } catch (signOutError) {
        console.error("Error signing out after login failure:", signOutError);
      }

      // Provide more specific error messages based on Firebase error codes
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
            console.warn("Unhandled Firebase auth error code:", error.code);
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
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || "Cierre de sesión fallido");
    }
  }

  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || "Restablecimiento de contraseña fallido");
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      return {
        id: firebaseUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        userType: userData.userType,
        createdAt: userData.createdAt.toDate(),
        profileImage: userData.profileImage,
      };
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Google Sign-In
  static async signInWithGoogle(): Promise<User> {
    try {
      console.log("Starting Google Sign-In");
      const userCredential = await SSOService.signInWithGoogle();
      const firebaseUser = userCredential.user;

      console.log("Google Sign-In successful, checking user data");

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));

      if (userDoc.exists()) {
        // User exists, return user data
        const userData = userDoc.data();
        console.log("Existing user found:", userData.email);
        return {
          id: firebaseUser.uid,
          email: userData.email,
          displayName: userData.displayName,
          userType: userData.userType,
          createdAt: userData.createdAt.toDate(),
          profileImage: userData.profileImage,
        };
      } else {
        // New user, create user document
        console.log("New Google user, creating account");
        const userData: Omit<User, "id"> = {
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          userType: "customer", // Default to customer for SSO users
          createdAt: new Date(),
          profileImage: firebaseUser.photoURL || undefined,
        };

        await setDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid), userData);

        // Send welcome email in background
        EmailService.sendWelcomeEmail({
          email: userData.email,
          displayName: userData.displayName,
          userType: userData.userType,
        }).catch((error) => {
          console.error("Failed to send welcome email:", error);
        });

        return {
          id: firebaseUser.uid,
          ...userData,
        };
      }
    } catch (error: any) {
      console.error("Google Sign-In error:", error);

      // Ensure user is signed out on any login failure
      try {
        await signOut(auth);
        await SSOService.signOutGoogle();
      } catch (signOutError) {
        console.error("Error signing out after Google login failure:", signOutError);
      }

      throw new Error(error.message || "Error al iniciar sesión con Google");
    }
  }

  // Facebook Sign-In
  static async signInWithFacebook(): Promise<User> {
    try {
      console.log("Starting Facebook Sign-In");
      const userCredential = await SSOService.signInWithFacebook();
      const firebaseUser = userCredential.user;

      console.log("Facebook Sign-In successful, checking user data");

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid));

      if (userDoc.exists()) {
        // User exists, return user data
        const userData = userDoc.data();
        console.log("Existing user found:", userData.email);
        return {
          id: firebaseUser.uid,
          email: userData.email,
          displayName: userData.displayName,
          userType: userData.userType,
          createdAt: userData.createdAt.toDate(),
          profileImage: userData.profileImage,
        };
      } else {
        // New user, create user document
        console.log("New Facebook user, creating account");
        const userData: Omit<User, "id"> = {
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          userType: "customer", // Default to customer for SSO users
          createdAt: new Date(),
          profileImage: firebaseUser.photoURL || undefined,
        };

        await setDoc(doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid), userData);

        // Send welcome email in background
        EmailService.sendWelcomeEmail({
          email: userData.email,
          displayName: userData.displayName,
          userType: userData.userType,
        }).catch((error) => {
          console.error("Failed to send welcome email:", error);
        });

        return {
          id: firebaseUser.uid,
          ...userData,
        };
      }
    } catch (error: any) {
      console.error("Facebook Sign-In error:", error);

      // Ensure user is signed out on any login failure
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Error signing out after Facebook login failure:", signOutError);
      }

      throw new Error(error.message || "Error al iniciar sesión con Facebook");
    }
  }
}

// User Service
export class UserService {
  static async updateUser(userId: string, userData: Partial<Pick<User, "displayName" | "profileImage">>): Promise<void> {
    try {
      console.log("Updating user with data:", userData);

      // Update user document in Firestore
      const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date(),
      });

      // If displayName is being updated, also update Firebase Auth profile
      if (userData.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: userData.displayName,
        });
      }

      console.log("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error("Error al actualizar el perfil del usuario");
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, userId));
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      return {
        id: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        userType: userData.userType,
        createdAt: userData.createdAt.toDate(),
        profileImage: userData.profileImage,
      };
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  }
}

// Business Service
export class BusinessService {
  static async createBusiness(businessData: Omit<Business, "id" | "createdAt">): Promise<Business> {
    try {
      console.log("Creating business with data:", businessData); // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("El usuario debe estar autenticado para crear un negocio");
      }

      // Filter out undefined values as Firestore doesn't accept them
      const cleanData = Object.fromEntries(Object.entries(businessData).filter(([_, value]) => value !== undefined && value !== ""));

      console.log("Cleaned business data:", cleanData);

      const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), {
        ...cleanData,
        createdAt: Timestamp.now(),
      });

      console.log("Business created successfully with ID:", docRef.id);

      return {
        id: docRef.id,
        ...businessData,
        createdAt: new Date(),
      };
    } catch (error: any) {
      console.error("Failed to create business:", error); // Provide more specific error messages
      if (error.code) {
        switch (error.code) {
          case "permission-denied":
            throw new Error("Permiso denegado. Por favor verifica las reglas de seguridad de Firestore.");
          case "unauthenticated":
            throw new Error("Autenticación requerida. Por favor inicia sesión e intenta de nuevo.");
          case "not-found":
            throw new Error("Base de datos Firestore no encontrada. Por favor verifica la configuración de Firebase.");
          case "unavailable":
            throw new Error("El servicio Firestore no está disponible temporalmente. Por favor intenta de nuevo.");
          default:
            throw new Error(`Error de Firestore (${error.code}): ${error.message}`);
        }
      }

      throw new Error(error.message || "Error al crear el negocio");
    }
  }
  static async getBusinessByOwnerId(ownerId: string): Promise<Business | null> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), where("ownerId", "==", ownerId), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return null;
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        logoUrl: data.logoUrl,
        address: data.address,
        phone: data.phone,
        city: data.city,
        instagram: data.instagram,
        facebook: data.facebook,
        tiktok: data.tiktok,
        categories: data.categories,
        createdAt: data.createdAt.toDate(),
        isActive: data.isActive,
      };
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener el negocio");
    }
  }
  static async updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
    try {
      console.log("Updating business with ID:", businessId);
      console.log("Update data:", updates);

      // Filter out undefined values and id/createdAt fields that shouldn't be updated
      const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([key, value]) => value !== undefined && value !== "" && key !== "id" && key !== "createdAt"));

      console.log("Cleaned update data:", cleanUpdates);

      await updateDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId), cleanUpdates);
      console.log("Business updated successfully");
    } catch (error: any) {
      console.error("Failed to update business:", error); // Provide more specific error messages
      if (error.code) {
        switch (error.code) {
          case "permission-denied":
            throw new Error("Permiso denegado. Por favor verifica las reglas de seguridad de Firestore.");
          case "unauthenticated":
            throw new Error("Autenticación requerida. Por favor inicia sesión e intenta de nuevo.");
          case "not-found":
            throw new Error("Negocio no encontrado. Puede haber sido eliminado.");
          case "unavailable":
            throw new Error("El servicio Firestore no está disponible temporalmente. Por favor intenta de nuevo.");
          default:
            throw new Error(`Error de Firestore (${error.code}): ${error.message}`);
        }
      }

      throw new Error(error.message || "Error al actualizar el negocio");
    }
  }
  static async getAllBusinesses(): Promise<Business[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), where("isActive", "==", true), orderBy("name"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          ownerId: data.ownerId,
          logoUrl: data.logoUrl,
          address: data.address,
          phone: data.phone,
          city: data.city,
          instagram: data.instagram,
          facebook: data.facebook,
          tiktok: data.tiktok,
          categories: data.categories,
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener los negocios");
    }
  }
  // Paginated businesses for better performance
  static async getPaginatedBusinesses(page: number = 0, pageSize: number = 10): Promise<Business[]> {
    try {
      const offset = page * pageSize;
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.BUSINESSES),
        where("isActive", "==", true),
        orderBy("name"),
        limit(pageSize + offset) // Get all items up to the current page
      );
      const querySnapshot = await getDocs(q);

      // Skip the items before the current page
      const allResults = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          ownerId: data.ownerId,
          logoUrl: data.logoUrl,
          address: data.address,
          phone: data.phone,
          city: data.city,
          instagram: data.instagram,
          facebook: data.facebook,
          tiktok: data.tiktok,
          categories: data.categories,
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });

      // Return only the current page results
      return allResults.slice(offset, offset + pageSize);
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener los negocios");
    }
  }
  static async getBusiness(businessId: string): Promise<Business | null> {
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        logoUrl: data.logoUrl,
        address: data.address,
        phone: data.phone,
        city: data.city,
        instagram: data.instagram,
        facebook: data.facebook,
        tiktok: data.tiktok,
        categories: data.categories,
        createdAt: data.createdAt.toDate(),
        isActive: data.isActive,
      };
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener el negocio");
    }
  }
  static async getBusinessesByOwner(ownerId: string): Promise<Business[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), where("ownerId", "==", ownerId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          ownerId: data.ownerId,
          logoUrl: data.logoUrl,
          address: data.address,
          phone: data.phone,
          city: data.city,
          instagram: data.instagram,
          facebook: data.facebook,
          tiktok: data.tiktok,
          categories: data.categories,
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener los negocios del propietario");
    }
  }
}

// Loyalty Card Service
export class LoyaltyCardService {
  static async createLoyaltyCard(cardData: Omit<LoyaltyCard, "id" | "createdAt">): Promise<LoyaltyCard> {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("El usuario debe estar autenticado para crear una tarjeta de fidelidad");
      }

      console.log("Creating loyalty card with data:", cardData);
      console.log("Current user:", auth.currentUser.uid, auth.currentUser.email);

      // Filter out undefined values as Firestore doesn't accept them
      const cleanData = Object.fromEntries(Object.entries(cardData).filter(([_, value]) => value !== undefined && value !== ""));

      console.log("Cleaned loyalty card data:", cleanData);

      const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), {
        ...cleanData,
        ownerId: auth.currentUser.uid, // Add the current user's ID as owner
        createdAt: Timestamp.now(),
      });

      console.log("Loyalty card created successfully with ID:", docRef.id);

      return {
        id: docRef.id,
        ...cardData,
        createdAt: new Date(),
      };
    } catch (error: any) {
      console.error("Failed to create loyalty card:", error); // Provide more specific error messages
      if (error.code) {
        switch (error.code) {
          case "permission-denied":
            throw new Error("Permiso denegado. Por favor verifica tu estado de autenticación o contacta soporte.");
          case "unauthenticated":
            throw new Error("Debes iniciar sesión para crear una tarjeta de fidelidad.");
          case "invalid-argument":
            throw new Error("Datos inválidos proporcionados. Por favor verifica todos los campos requeridos.");
          default:
            throw new Error(`Error de Firestore (${error.code}): ${error.message}`);
        }
      }

      throw new Error(error.message || "Error al crear la tarjeta de fidelidad");
    }
  }

  private static async getBusiness(businessId: string): Promise<Business | null> {
    return await BusinessService.getBusiness(businessId);
  }

  static async getLoyaltyCardsByBusinessId(businessId: string): Promise<LoyaltyCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "==", businessId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      // Get business information once for all cards
      const business = await this.getBusiness(businessId);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          businessId: data.businessId,
          businessName: business?.name || "",
          businessLogo: business?.logoUrl,
          totalSlots: data.totalSlots,
          rewardDescription: data.rewardDescription,
          cardColor: data.cardColor,
          stampShape: data.stampShape,
          backgroundImage: data.backgroundImage,
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las tarjetas de fidelidad");
    }
  }
  static async getAllActiveLoyaltyCards(): Promise<LoyaltyCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("isActive", "==", true), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q); // Get all business IDs and fetch business information
      const businessIds = Array.from(new Set(querySnapshot.docs.map((doc) => doc.data().businessId)));
      const businessesMap = new Map<string, Business>();

      for (const businessId of businessIds) {
        const business = await this.getBusiness(businessId);
        if (business) {
          businessesMap.set(businessId, business);
        }
      }

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const business = businessesMap.get(data.businessId);
        return {
          id: doc.id,
          businessId: data.businessId,
          businessName: business?.name || "",
          businessLogo: business?.logoUrl,
          totalSlots: data.totalSlots,
          rewardDescription: data.rewardDescription,
          cardColor: data.cardColor,
          stampShape: data.stampShape,
          backgroundImage: data.backgroundImage,
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las tarjetas de fidelidad");
    }
  }

  static async updateLoyaltyCard(cardId: string, updates: Partial<LoyaltyCard>): Promise<void> {
    try {
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId), updates);
    } catch (error: any) {
      throw new Error(error.message || "Error al actualizar la tarjeta de fidelidad");
    }
  }
  static async deactivateLoyaltyCard(cardId: string): Promise<void> {
    try {
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId), {
        isActive: false,
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al desactivar la tarjeta de fidelidad");
    }
  }

  static async deleteLoyaltyCard(cardId: string): Promise<void> {
    try {
      console.log("Starting deletion process for loyalty card:", cardId);

      // 1. Get all customer cards associated with this loyalty card
      const customerCardsQuery = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("loyaltyCardId", "==", cardId));
      const customerCardsSnapshot = await getDocs(customerCardsQuery);

      console.log("Found", customerCardsSnapshot.docs.length, "customer cards to delete");

      // 2. Delete all stamp activities for these customer cards
      const deletePromises: Promise<any>[] = [];

      for (const customerCardDoc of customerCardsSnapshot.docs) {
        const customerCardId = customerCardDoc.id;

        // Get stamp activities for this customer card
        const stampActivitiesQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), where("customerCardId", "==", customerCardId));
        const stampActivitiesSnapshot = await getDocs(stampActivitiesQuery);

        console.log("Found", stampActivitiesSnapshot.docs.length, "stamp activities for customer card", customerCardId);

        // Add stamp activity deletions to promises
        stampActivitiesSnapshot.docs.forEach((stampActivityDoc) => {
          deletePromises.push(deleteDoc(doc(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY, stampActivityDoc.id)));
        });
      }

      // 3. Delete all stamps for these customer cards
      for (const customerCardDoc of customerCardsSnapshot.docs) {
        const customerCardId = customerCardDoc.id;

        // Get stamps for this customer card
        const stampsQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMPS), where("customerCardId", "==", customerCardId));
        const stampsSnapshot = await getDocs(stampsQuery);

        console.log("Found", stampsSnapshot.docs.length, "stamps for customer card", customerCardId);

        // Add stamp deletions to promises
        stampsSnapshot.docs.forEach((stampDoc) => {
          deletePromises.push(deleteDoc(doc(db, FIREBASE_COLLECTIONS.STAMPS, stampDoc.id)));
        });
      }

      // 4. Delete all customer cards
      customerCardsSnapshot.docs.forEach((customerCardDoc) => {
        deletePromises.push(deleteDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardDoc.id)));
      });

      // 5. Execute all deletions in parallel
      console.log("Executing", deletePromises.length, "deletion operations");
      await Promise.all(deletePromises);

      // 6. Finally, delete the loyalty card itself
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId));

      console.log("Loyalty card deletion completed successfully");
    } catch (error: any) {
      console.error("Error during loyalty card deletion:", error);
      throw new Error(error.message || "Error al eliminar la tarjeta de fidelidad");
    }
  }
  static async getLoyaltyCard(cardId: string): Promise<LoyaltyCard | null> {
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      // Get business information from Business collection
      const business = await this.getBusiness(data.businessId);

      return {
        id: docSnap.id,
        businessId: data.businessId,
        businessName: business?.name || "",
        businessLogo: business?.logoUrl,
        totalSlots: data.totalSlots,
        rewardDescription: data.rewardDescription,
        cardColor: data.cardColor,
        stampShape: data.stampShape,
        backgroundImage: data.backgroundImage,
        createdAt: data.createdAt.toDate(),
        isActive: data.isActive,
      };
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener la tarjeta de fidelidad");
    }
  }

  static async getLoyaltyCardsByBusiness(businessId: string): Promise<LoyaltyCard[]> {
    return this.getLoyaltyCardsByBusinessId(businessId);
  }

  // Batch fetch loyalty cards for multiple businesses
  static async getLoyaltyCardsByBusinessIds(businessIds: string[]): Promise<LoyaltyCard[]> {
    if (businessIds.length === 0) return [];

    try {
      // Firestore 'in' queries are limited to 10 items, so we need to batch
      const batchSize = 10;
      const batches: Promise<LoyaltyCard[]>[] = [];

      for (let i = 0; i < businessIds.length; i += batchSize) {
        const batchIds = businessIds.slice(i, i + batchSize);
        const batchPromise = this.getLoyaltyCardsBatch(batchIds);
        batches.push(batchPromise);
      }

      const batchResults = await Promise.all(batches);
      return batchResults.flat();
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las tarjetas de fidelidad");
    }
  }

  private static async getLoyaltyCardsBatch(businessIds: string[]): Promise<LoyaltyCard[]> {
    const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "in", businessIds), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    // Get business information for all businesses in batch
    const businessesMap = new Map<string, Business>();
    const uniqueBusinessIds = Array.from(new Set(businessIds));

    await Promise.all(
      uniqueBusinessIds.map(async (businessId) => {
        const business = await BusinessService.getBusiness(businessId);
        if (business) {
          businessesMap.set(businessId, business);
        }
      })
    );

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const business = businessesMap.get(data.businessId);
      return {
        id: doc.id,
        businessId: data.businessId,
        businessName: business?.name || "",
        businessLogo: business?.logoUrl,
        totalSlots: data.totalSlots,
        rewardDescription: data.rewardDescription,
        cardColor: data.cardColor,
        stampShape: data.stampShape,
        backgroundImage: data.backgroundImage,
        createdAt: data.createdAt.toDate(),
        isActive: data.isActive,
      };
    });
  }
}

// Customer Card Service
export class CustomerCardService {
  static async joinLoyaltyProgram(customerId: string, loyaltyCardId: string, cardCode?: string): Promise<CustomerCard> {
    try {
      // Check if customer already has this card (unclaimed only)
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("customerId", "==", customerId),
        where("loyaltyCardId", "==", loyaltyCardId),
        where("isRewardClaimed", "==", false),
        limit(1)
      );
      const existingCards = await getDocs(q);
      if (!existingCards.empty) {
        throw new Error("Ya estás inscrito en este programa de fidelidad");
      }

      // Get loyalty card to extract business ID
      const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, loyaltyCardId));
      if (!loyaltyCardDoc.exists()) {
        throw new Error("Tarjeta de fidelidad no encontrada");
      }
      const loyaltyCardData = loyaltyCardDoc.data();
      const businessId = loyaltyCardData.businessId;

      // Get customer name from the Users collection (customer can read their own data)
      let customerName = "";
      try {
        const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, customerId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          customerName = userData.displayName || "";
        }
      } catch (error) {
        console.warn("No se pudo obtener el nombre del cliente durante la creación de la tarjeta:", error);
        // Continuar sin el nombre del cliente si la obtención falla
      }

      const customerCardData = {
        customerId,
        loyaltyCardId,
        businessId, // Add business ID for efficient querying
        currentStamps: 0,
        isRewardClaimed: false,
        createdAt: Timestamp.now(),
        customerName, // Store customer name at creation time
        ...(cardCode && { cardCode }),
      };

      const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), customerCardData);

      return {
        id: docRef.id,
        customerId,
        loyaltyCardId,
        businessId,
        currentStamps: 0,
        isRewardClaimed: false,
        createdAt: new Date(),
        customerName,
        cardCode,
      };
    } catch (error: any) {
      throw new Error(error.message || "Error al unirse al programa de fidelidad");
    }
  }

  // Get all customer cards including claimed ones (for statistics)
  static async getAllCustomerCards(customerId: string): Promise<CustomerCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("customerId", "==", customerId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const customerCards = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const customerCard: CustomerCard = {
            id: docSnapshot.id,
            customerId: data.customerId,
            loyaltyCardId: data.loyaltyCardId,
            businessId: data.businessId || "", // Handle existing records without businessId
            currentStamps: data.currentStamps,
            isRewardClaimed: data.isRewardClaimed,
            createdAt: data.createdAt.toDate(),
            lastStampDate: data.lastStampDate?.toDate(),
            cardCode: data.cardCode,
            customerName: data.customerName, // Get stored customer name
          }; // Get loyalty card details
          const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId));
          if (loyaltyCardDoc.exists()) {
            const loyaltyCardData = loyaltyCardDoc.data();

            // Get business information from Business collection
            const business = await BusinessService.getBusiness(loyaltyCardData.businessId);

            customerCard.loyaltyCard = {
              id: loyaltyCardDoc.id,
              businessId: loyaltyCardData.businessId,
              businessName: business?.name || "",
              businessLogo: business?.logoUrl,
              totalSlots: loyaltyCardData.totalSlots,
              rewardDescription: loyaltyCardData.rewardDescription,
              cardColor: loyaltyCardData.cardColor,
              stampShape: loyaltyCardData.stampShape,
              backgroundImage: loyaltyCardData.backgroundImage,
              createdAt: loyaltyCardData.createdAt.toDate(),
              isActive: loyaltyCardData.isActive,
            };
          }

          return customerCard;
        })
      );

      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener todas las tarjetas del cliente");
    }
  }

  // Get customer cards with unclaimed rewards only (for active cards display)
  static async getUnclaimedRewardCustomerCards(customerId: string): Promise<CustomerCard[]> {
    try {
      // Only return cards where rewards have not been claimed
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("customerId", "==", customerId), where("isRewardClaimed", "==", false), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const customerCards = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const customerCard: CustomerCard = {
            id: docSnapshot.id,
            customerId: data.customerId,
            loyaltyCardId: data.loyaltyCardId,
            businessId: data.businessId || "", // Handle existing records without businessId
            currentStamps: data.currentStamps,
            isRewardClaimed: data.isRewardClaimed,
            createdAt: data.createdAt.toDate(),
            lastStampDate: data.lastStampDate?.toDate(),
            cardCode: data.cardCode,
            customerName: data.customerName, // Get stored customer name
          }; // Get loyalty card details
          const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId));
          if (loyaltyCardDoc.exists()) {
            const loyaltyCardData = loyaltyCardDoc.data();

            // Get business information from Business collection
            const business = await BusinessService.getBusiness(loyaltyCardData.businessId);

            customerCard.loyaltyCard = {
              id: loyaltyCardDoc.id,
              businessId: loyaltyCardData.businessId,
              businessName: business?.name || "",
              businessLogo: business?.logoUrl,
              totalSlots: loyaltyCardData.totalSlots,
              rewardDescription: loyaltyCardData.rewardDescription,
              cardColor: loyaltyCardData.cardColor,
              stampShape: loyaltyCardData.stampShape,
              backgroundImage: loyaltyCardData.backgroundImage,
              createdAt: loyaltyCardData.createdAt.toDate(),
              isActive: loyaltyCardData.isActive,
            };
          }

          return customerCard;
        })
      );

      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las tarjetas del cliente");
    }
  }
  static async addStamp(customerCardId: string, customerId: string, businessId: string, loyaltyCardId: string): Promise<void> {
    try {
      console.log("addStamp: Starting stamp addition process", { customerCardId, customerId, businessId, loyaltyCardId });

      // Get current customer card
      const customerCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId));
      if (!customerCardDoc.exists()) {
        throw new Error("Tarjeta de cliente no encontrada");
      }

      const customerCardData = customerCardDoc.data();
      const newStampCount = customerCardData.currentStamps + 1;
      console.log("addStamp: Current stamps:", customerCardData.currentStamps, "New count:", newStampCount);

      // Add stamp record
      await addDoc(collection(db, FIREBASE_COLLECTIONS.STAMPS), {
        customerCardId,
        customerId,
        businessId,
        loyaltyCardId,
        timestamp: Timestamp.now(),
      });
      console.log("addStamp: Stamp record added");

      // Update customer card
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId), {
        currentStamps: newStampCount,
        lastStampDate: Timestamp.now(),
      });
      console.log("addStamp: Customer card updated");

      // Create stamp activity record
      console.log("addStamp: Creating stamp activity...");
      await StampActivityService.createStampActivity(customerCardId, customerId, businessId, loyaltyCardId, newStampCount, "Sello agregado");
      console.log("addStamp: Stamp activity created successfully");
    } catch (error: any) {
      console.error("addStamp: Error occurred:", error);
      throw new Error(error.message || "Error al agregar sello");
    }
  }

  static async getCustomerCard(customerCardId: string): Promise<CustomerCard | null> {
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }
      const data = docSnap.data();
      const customerCard: CustomerCard = {
        id: docSnap.id,
        customerId: data.customerId,
        loyaltyCardId: data.loyaltyCardId,
        businessId: data.businessId || "", // Handle existing records without businessId
        currentStamps: data.currentStamps,
        isRewardClaimed: data.isRewardClaimed,
        createdAt: data.createdAt.toDate(),
        lastStampDate: data.lastStampDate?.toDate(),
        cardCode: data.cardCode,
        customerName: data.customerName, // Get stored customer name
      };

      // Get loyalty card details
      const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId));
      if (loyaltyCardDoc.exists()) {
        const loyaltyCardData = loyaltyCardDoc.data();

        // Set businessId if it's missing from the customer card (for backward compatibility)
        if (!customerCard.businessId) {
          customerCard.businessId = loyaltyCardData.businessId;
        }

        // Get business information from Business collection
        const business = await BusinessService.getBusiness(loyaltyCardData.businessId);

        customerCard.loyaltyCard = {
          id: loyaltyCardDoc.id,
          businessId: loyaltyCardData.businessId,
          businessName: business?.name || "",
          businessLogo: business?.logoUrl,
          totalSlots: loyaltyCardData.totalSlots,
          rewardDescription: loyaltyCardData.rewardDescription,
          cardColor: loyaltyCardData.cardColor,
          stampShape: loyaltyCardData.stampShape,
          backgroundImage: loyaltyCardData.backgroundImage,
          createdAt: loyaltyCardData.createdAt.toDate(),
          isActive: loyaltyCardData.isActive,
        };
      }

      return customerCard;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener la tarjeta del cliente");
    }
  }

  // Optimized method to get customer cards for a specific business
  static async getCustomerCardsByBusiness(customerId: string, businessId: string): Promise<CustomerCard[]> {
    try {
      console.log("getCustomerCardsByBusiness: Fetching cards for customer:", customerId, "business:", businessId);

      // First, get all loyalty cards for this business
      const loyaltyCardsQuery = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "==", businessId), where("isActive", "==", true));
      const loyaltyCardsSnapshot = await getDocs(loyaltyCardsQuery);
      const loyaltyCardIds = loyaltyCardsSnapshot.docs.map((doc) => doc.id);

      if (loyaltyCardIds.length === 0) {
        return [];
      } // Then get customer cards for these loyalty cards
      const customerCardsQuery = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("customerId", "==", customerId),
        where("loyaltyCardId", "in", loyaltyCardIds),
        where("isRewardClaimed", "==", false),
        orderBy("createdAt", "desc")
      );
      const customerCardsSnapshot = await getDocs(customerCardsQuery);

      // Get business info once
      const business = await BusinessService.getBusiness(businessId);

      const customerCards = await Promise.all(
        customerCardsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const customerCard: CustomerCard = {
            id: docSnapshot.id,
            customerId: data.customerId,
            loyaltyCardId: data.loyaltyCardId,
            businessId: data.businessId || businessId, // Use provided businessId as fallback
            currentStamps: data.currentStamps,
            isRewardClaimed: data.isRewardClaimed,
            createdAt: data.createdAt.toDate(),
            lastStampDate: data.lastStampDate?.toDate(),
            cardCode: data.cardCode,
            customerName: data.customerName,
          };

          // Get loyalty card details (already have it from the first query)
          const loyaltyCardDoc = loyaltyCardsSnapshot.docs.find((doc) => doc.id === data.loyaltyCardId);
          if (loyaltyCardDoc) {
            const loyaltyCardData = loyaltyCardDoc.data();
            customerCard.loyaltyCard = {
              id: loyaltyCardDoc.id,
              businessId: loyaltyCardData.businessId,
              businessName: business?.name || "",
              businessLogo: business?.logoUrl,
              totalSlots: loyaltyCardData.totalSlots,
              rewardDescription: loyaltyCardData.rewardDescription,
              cardColor: loyaltyCardData.cardColor,
              stampShape: loyaltyCardData.stampShape,
              backgroundImage: loyaltyCardData.backgroundImage,
              createdAt: loyaltyCardData.createdAt.toDate(),
              isActive: loyaltyCardData.isActive,
            };
          }

          return customerCard;
        })
      );

      console.log(`getCustomerCardsByBusiness: Found ${customerCards.length} cards`);
      return customerCards;
    } catch (error: any) {
      console.error("getCustomerCardsByBusiness error:", error);
      throw new Error(error.message || "Error al obtener las tarjetas del cliente para el negocio");
    }
  }
  static async getActiveCustomerCardsWithUnclaimedRewards(loyaltyCardId: string): Promise<CustomerCard[]> {
    try {
      // Query for customer cards with unclaimed rewards only
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("loyaltyCardId", "==", loyaltyCardId), where("isRewardClaimed", "==", false), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const customerCards = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          // Create base customer card object
          const customerCard: CustomerCard = {
            id: docSnapshot.id,
            customerId: data.customerId,
            loyaltyCardId: data.loyaltyCardId,
            businessId: data.businessId || "", // Handle existing records without businessId
            currentStamps: data.currentStamps,
            isRewardClaimed: data.isRewardClaimed,
            createdAt: data.createdAt.toDate(),
            lastStampDate: data.lastStampDate?.toDate(),
            cardCode: data.cardCode, // Include card code
            customerName: data.customerName, // Get stored customer name
          };

          return customerCard;
        })
      );

      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las tarjetas activas del cliente sin recompensas canjeadas");
    }
  }
  static async getUnclaimedCustomerCardByCodeAndBusiness(cardCode: string, businessId: string): Promise<CustomerCard | null> {
    try {
      // Single compound query to get customer card by code and business ID
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("cardCode", "==", cardCode), where("businessId", "==", businessId), where("isRewardClaimed", "==", false), limit(1));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const docSnapshot = querySnapshot.docs[0];
      const data = docSnapshot.data();

      const customerCard: CustomerCard = {
        id: docSnapshot.id,
        customerId: data.customerId,
        loyaltyCardId: data.loyaltyCardId,
        businessId: data.businessId,
        currentStamps: data.currentStamps,
        isRewardClaimed: data.isRewardClaimed,
        createdAt: data.createdAt.toDate(),
        lastStampDate: data.lastStampDate?.toDate(),
        cardCode: data.cardCode,
        customerName: data.customerName,
      };

      // Get loyalty card details in parallel with business details
      const [loyaltyCardDoc, business] = await Promise.all([getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId)), BusinessService.getBusiness(businessId)]);

      if (loyaltyCardDoc.exists()) {
        const loyaltyCardData = loyaltyCardDoc.data();
        customerCard.loyaltyCard = {
          id: loyaltyCardDoc.id,
          businessId: loyaltyCardData.businessId,
          businessName: business?.name || "",
          businessLogo: business?.logoUrl,
          totalSlots: loyaltyCardData.totalSlots,
          rewardDescription: loyaltyCardData.rewardDescription,
          cardColor: loyaltyCardData.cardColor,
          stampShape: loyaltyCardData.stampShape,
          backgroundImage: loyaltyCardData.backgroundImage,
          createdAt: loyaltyCardData.createdAt.toDate(),
          isActive: loyaltyCardData.isActive,
        };
      }

      return customerCard;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener la tarjeta del cliente por código y negocio");
    }
  }

  static async addStampByCardCodeAndBusiness(cardCode: string, businessId: string): Promise<void> {
    try {
      // Find customer card by card code and business ID
      const customerCard = await this.getUnclaimedCustomerCardByCodeAndBusiness(cardCode, businessId);
      if (!customerCard) {
        throw new Error("Tarjeta de cliente no encontrada con este código para este negocio");
      }

      // Add stamp
      await this.addStamp(customerCard.id, customerCard.customerId, businessId, customerCard.loyaltyCardId);
    } catch (error: any) {
      throw new Error(error.message || "Error al agregar sello por código de tarjeta y negocio");
    }
  }

  static async claimRewardByCardCodeAndBusiness(cardCode: string, businessId: string): Promise<void> {
    try {
      // Find customer card by card code and business ID
      const customerCard = await this.getUnclaimedCustomerCardByCodeAndBusiness(cardCode, businessId);
      if (!customerCard) {
        throw new Error("Tarjeta de cliente no encontrada con este código para este negocio");
      }

      if (!customerCard.loyaltyCard) {
        throw new Error("Información de tarjeta de lealtad no encontrada");
      }

      // Check if card has enough stamps to claim reward
      if (customerCard.currentStamps < customerCard.loyaltyCard.totalSlots) {
        throw new Error("La tarjeta no tiene suficientes sellos para canjear la recompensa");
      }

      // Mark reward as claimed
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCard.id), {
        isRewardClaimed: true,
      });

      // Create reward record
      await addDoc(collection(db, FIREBASE_COLLECTIONS.REWARDS), {
        customerCardId: customerCard.id,
        customerId: customerCard.customerId,
        businessId: businessId,
        loyaltyCardId: customerCard.loyaltyCardId,
        claimedAt: Timestamp.now(),
        isRedeemed: true,
        note: "Recompensa canjeada por el negocio",
      });

      // Create stamp activity record for reward claiming
      await StampActivityService.createStampActivity(customerCard.id, customerCard.customerId, businessId, customerCard.loyaltyCardId, customerCard.loyaltyCard.totalSlots, "Recompensa canjeada");
    } catch (error: any) {
      throw new Error(error.message || "Error al canjear recompensa por código de tarjeta y negocio");
    }
  }

  static async getAllCustomerCardsByLoyaltyCard(loyaltyCardId: string): Promise<CustomerCard[]> {
    try {
      // Query for all customer cards (including those with claimed rewards) for statistics
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("loyaltyCardId", "==", loyaltyCardId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const customerCards = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          // Create base customer card object
          const customerCard: CustomerCard = {
            id: docSnapshot.id,
            customerId: data.customerId,
            loyaltyCardId: data.loyaltyCardId,
            businessId: data.businessId || "", // Handle existing records without businessId
            currentStamps: data.currentStamps,
            isRewardClaimed: data.isRewardClaimed,
            createdAt: data.createdAt.toDate(),
            lastStampDate: data.lastStampDate?.toDate(),
            cardCode: data.cardCode, // Include card code
            customerName: data.customerName, // Get stored customer name
          };

          return customerCard;
        })
      );

      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener todas las tarjetas del cliente por tarjeta de fidelidad");
    }
  }

  // Get redemption count for a specific customer and loyalty card
  static async getRedemptionCount(customerId: string, loyaltyCardId: string): Promise<number> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("customerId", "==", customerId), where("loyaltyCardId", "==", loyaltyCardId), where("isRewardClaimed", "==", true));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error: any) {
      console.error("Error getting redemption count:", error);
      return 0; // Return 0 if there's an error
    }
  }

  // Delete a specific customer card and all its associated data
  static async deleteCustomerCard(customerCardId: string): Promise<void> {
    try {
      console.log("Starting deletion process for customer card:", customerCardId);

      // 1. Delete all stamp activities for this customer card
      const stampActivitiesQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), where("customerCardId", "==", customerCardId));
      const stampActivitiesSnapshot = await getDocs(stampActivitiesQuery);

      console.log("Found", stampActivitiesSnapshot.docs.length, "stamp activities to delete");

      // 2. Delete all stamps for this customer card
      const stampsQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMPS), where("customerCardId", "==", customerCardId));
      const stampsSnapshot = await getDocs(stampsQuery);

      console.log("Found", stampsSnapshot.docs.length, "stamps to delete");

      // 3. Delete all rewards for this customer card
      const rewardsQuery = query(collection(db, FIREBASE_COLLECTIONS.REWARDS), where("customerCardId", "==", customerCardId));
      const rewardsSnapshot = await getDocs(rewardsQuery);

      console.log("Found", rewardsSnapshot.docs.length, "rewards to delete");

      // 4. Execute all deletions in parallel
      const deletePromises: Promise<any>[] = [];

      // Add stamp activity deletions
      stampActivitiesSnapshot.docs.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      // Add stamp deletions
      stampsSnapshot.docs.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      // Add reward deletions
      rewardsSnapshot.docs.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      console.log("Executing", deletePromises.length, "deletion operations");
      await Promise.all(deletePromises);

      // 5. Finally, delete the customer card itself
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId));

      console.log("Customer card deletion completed successfully");
    } catch (error: any) {
      console.error("Error during customer card deletion:", error);
      throw new Error(error.message || "Error al eliminar la tarjeta de cliente");
    }
  }
}

// Stamp Activity Service
export class StampActivityService {
  static async createStampActivity(customerCardId: string, customerId: string, businessId: string, loyaltyCardId: string, stampCount: number, note?: string): Promise<StampActivity> {
    try {
      console.log("createStampActivity: Starting activity creation", { customerCardId, customerId, businessId, loyaltyCardId, stampCount, note });

      // Get customer and business names for the activity record
      let customerName = "";
      let businessName = "";

      try {
        const [userDoc, businessDoc] = await Promise.all([getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, customerId)), getDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId))]);

        if (userDoc.exists()) {
          customerName = userDoc.data().displayName || "";
          console.log("createStampActivity: Customer name found:", customerName);
        }
        if (businessDoc.exists()) {
          businessName = businessDoc.data().name || "";
          console.log("createStampActivity: Business name found:", businessName);
        }
      } catch (error) {
        console.warn("createStampActivity: No se pudieron obtener los nombres para la actividad de sello:", error);
      }

      const stampActivityData = {
        customerCardId,
        customerId,
        businessId,
        loyaltyCardId,
        timestamp: Timestamp.now(),
        customerName,
        businessName,
        stampCount,
        ...(note && { note }),
      };

      console.log("createStampActivity: Adding document with data:", stampActivityData);
      const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), stampActivityData);
      console.log("createStampActivity: Document added successfully with ID:", docRef.id);

      return {
        id: docRef.id,
        customerCardId,
        customerId,
        businessId,
        loyaltyCardId,
        timestamp: new Date(),
        customerName,
        businessName,
        stampCount,
        note,
      };
    } catch (error: any) {
      console.error("createStampActivity: Error creating stamp activity:", error);
      throw new Error(error.message || "Error al crear actividad de sello");
    }
  }

  static async getStampActivitiesByCustomerCard(customerCardId: string): Promise<StampActivity[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), where("customerCardId", "==", customerCardId), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          customerCardId: data.customerCardId,
          customerId: data.customerId,
          businessId: data.businessId,
          loyaltyCardId: data.loyaltyCardId,
          timestamp: data.timestamp.toDate(),
          customerName: data.customerName,
          businessName: data.businessName,
          stampCount: data.stampCount,
          note: data.note,
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las actividades de sello para la tarjeta del cliente");
    }
  }
}
