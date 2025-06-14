import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { User, Business, LoyaltyCard, CustomerCard, Stamp, Reward, StampActivity } from "../types";

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
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });
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
  static async getLoyaltyCardByBusinessId(businessId: string): Promise<LoyaltyCard | null> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "==", businessId), where("isActive", "==", true), orderBy("createdAt", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return null;
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        businessId: data.businessId,
        businessName: data.businessName,
        businessLogo: data.businessLogo,
        totalSlots: data.totalSlots,
        rewardDescription: data.rewardDescription,
        cardColor: data.cardColor,
        createdAt: data.createdAt.toDate(),
        isActive: data.isActive,
      };
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener la tarjeta de fidelidad");
    }
  }
  static async getLoyaltyCardsByBusinessId(businessId: string): Promise<LoyaltyCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "==", businessId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          businessId: data.businessId,
          businessName: data.businessName,
          businessLogo: data.businessLogo,
          totalSlots: data.totalSlots,
          rewardDescription: data.rewardDescription,
          cardColor: data.cardColor,
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
      const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("isActive", "==", true), orderBy("businessName"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          businessId: data.businessId,
          businessName: data.businessName,
          businessLogo: data.businessLogo,
          totalSlots: data.totalSlots,
          rewardDescription: data.rewardDescription,
          cardColor: data.cardColor,
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

  static async deleteLoyaltyCard(cardId: string): Promise<void> {
    try {
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId), {
        isActive: false,
      });
    } catch (error: any) {
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
      return {
        id: docSnap.id,
        businessId: data.businessId,
        businessName: data.businessName,
        businessLogo: data.businessLogo,
        totalSlots: data.totalSlots,
        rewardDescription: data.rewardDescription,
        cardColor: data.cardColor,
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
}

// Customer Card Service
export class CustomerCardService {
  static async joinLoyaltyProgram(customerId: string, loyaltyCardId: string, cardCode?: string): Promise<CustomerCard> {
    try {
      // Check if customer already has this card
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("customerId", "==", customerId), where("loyaltyCardId", "==", loyaltyCardId), limit(1));
      const existingCards = await getDocs(q);
      if (!existingCards.empty) {
        throw new Error("Ya estás inscrito en este programa de fidelidad");
      }

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
  static async getCustomerCards(customerId: string): Promise<CustomerCard[]> {
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
            customerCard.loyaltyCard = {
              id: loyaltyCardDoc.id,
              businessId: loyaltyCardData.businessId,
              businessName: loyaltyCardData.businessName,
              businessLogo: loyaltyCardData.businessLogo,
              totalSlots: loyaltyCardData.totalSlots,
              rewardDescription: loyaltyCardData.rewardDescription,
              cardColor: loyaltyCardData.cardColor,
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
      // Get current customer card
      const customerCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId));
      if (!customerCardDoc.exists()) {
        throw new Error("Tarjeta de cliente no encontrada");
      }

      const customerCardData = customerCardDoc.data();
      const newStampCount = customerCardData.currentStamps + 1;

      // Add stamp record
      await addDoc(collection(db, FIREBASE_COLLECTIONS.STAMPS), {
        customerCardId,
        customerId,
        businessId,
        loyaltyCardId,
        timestamp: Timestamp.now(),
      });

      // Update customer card
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId), {
        currentStamps: newStampCount,
        lastStampDate: Timestamp.now(),
      });

      // Create stamp activity record
      await StampActivityService.createStampActivity(customerCardId, customerId, businessId, loyaltyCardId, newStampCount, "Sello agregado");
    } catch (error: any) {
      throw new Error(error.message || "Error al agregar sello");
    }
  }

  static async claimReward(customerCardId: string): Promise<void> {
    try {
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId), {
        isRewardClaimed: true,
        currentStamps: 0, // Reset stamps after claiming reward
      });

      // Add reward record
      const customerCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId));
      if (customerCardDoc.exists()) {
        const data = customerCardDoc.data();
        await addDoc(collection(db, FIREBASE_COLLECTIONS.REWARDS), {
          customerCardId,
          customerId: data.customerId,
          businessId: data.businessId,
          loyaltyCardId: data.loyaltyCardId,
          claimedAt: Timestamp.now(),
          isRedeemed: false,
        });
      }
    } catch (error: any) {
      throw new Error(error.message || "Error al reclamar recompensa");
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
        customerCard.loyaltyCard = {
          id: loyaltyCardDoc.id,
          businessId: loyaltyCardData.businessId,
          businessName: loyaltyCardData.businessName,
          businessLogo: loyaltyCardData.businessLogo,
          totalSlots: loyaltyCardData.totalSlots,
          rewardDescription: loyaltyCardData.rewardDescription,
          cardColor: loyaltyCardData.cardColor,
          createdAt: loyaltyCardData.createdAt.toDate(),
          isActive: loyaltyCardData.isActive,
        };
      }

      return customerCard;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener la tarjeta del cliente");
    }
  }
  static async getCustomerCardsByLoyaltyCard(loyaltyCardId: string): Promise<CustomerCard[]> {
    try {
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
      throw new Error(error.message || "Error al obtener las tarjetas del cliente por tarjeta de fidelidad");
    }
  }

  static async getCustomerCardByCode(cardCode: string, loyaltyCardId: string): Promise<CustomerCard | null> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("cardCode", "==", cardCode), where("loyaltyCardId", "==", loyaltyCardId), limit(1));
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
        currentStamps: data.currentStamps,
        isRewardClaimed: data.isRewardClaimed,
        createdAt: data.createdAt.toDate(),
        lastStampDate: data.lastStampDate?.toDate(),
        cardCode: data.cardCode,
        customerName: data.customerName,
      }; // Get loyalty card details
      const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId));
      if (loyaltyCardDoc.exists()) {
        const loyaltyCardData = loyaltyCardDoc.data();
        customerCard.loyaltyCard = {
          id: loyaltyCardDoc.id,
          businessId: loyaltyCardData.businessId,
          businessName: loyaltyCardData.businessName,
          businessLogo: loyaltyCardData.businessLogo,
          totalSlots: loyaltyCardData.totalSlots,
          rewardDescription: loyaltyCardData.rewardDescription,
          cardColor: loyaltyCardData.cardColor,
          createdAt: loyaltyCardData.createdAt.toDate(),
          isActive: loyaltyCardData.isActive,
        };
      }

      return customerCard;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener la tarjeta del cliente por código");
    }
  }
  static async addStampByCardCode(cardCode: string, loyaltyCardId: string): Promise<void> {
    try {
      // Find customer card by card code
      const customerCard = await this.getCustomerCardByCode(cardCode, loyaltyCardId);
      if (!customerCard) {
        throw new Error("Tarjeta de cliente no encontrada con este código de tarjeta");
      }

      // Get loyalty card to get business ID
      const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, loyaltyCardId));
      if (!loyaltyCardDoc.exists()) {
        throw new Error("Tarjeta de fidelidad no encontrada");
      }

      const loyaltyCardData = loyaltyCardDoc.data();
      const businessId = loyaltyCardData.businessId;

      // Add stamp
      await this.addStamp(customerCard.id, customerCard.customerId, businessId, loyaltyCardId);
    } catch (error: any) {
      throw new Error(error.message || "Error al agregar sello por código de tarjeta");
    }
  }
}

// Stamp Activity Service
export class StampActivityService {
  static async createStampActivity(customerCardId: string, customerId: string, businessId: string, loyaltyCardId: string, stampCount: number, note?: string): Promise<StampActivity> {
    try {
      // Get customer and business names for the activity record
      let customerName = "";
      let businessName = "";

      try {
        const [userDoc, businessDoc] = await Promise.all([getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, customerId)), getDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId))]);

        if (userDoc.exists()) {
          customerName = userDoc.data().displayName || "";
        }
        if (businessDoc.exists()) {
          businessName = businessDoc.data().name || "";
        }
      } catch (error) {
        console.warn("No se pudieron obtener los nombres para la actividad de sello:", error);
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

      const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), stampActivityData);

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
      throw new Error(error.message || "Error al crear actividad de sello");
    }
  }

  static async getStampActivitiesByBusiness(businessId: string): Promise<StampActivity[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), where("businessId", "==", businessId), orderBy("timestamp", "desc"));
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
      throw new Error(error.message || "Error al obtener las actividades de sello");
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
