import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import {
  User,
  Business,
  LoyaltyCard,
  CustomerCard,
  Stamp,
  Reward,
  StampActivity,
} from "../types";

// Auth Service
export class AuthService {
  static async register(
    email: string,
    password: string,
    displayName: string,
    userType: "customer" | "business"
  ): Promise<User> {
    try {
      console.log("Starting registration for:", email);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
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

      await setDoc(
        doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid),
        userData
      );

      return {
        id: firebaseUser.uid,
        ...userData,
      };
    } catch (error: any) {
      console.error("Registration error:", error);

      // Provide more specific error messages based on Firebase error codes
      let errorMessage = "Registration failed";

      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage =
              "This email address is already registered. Please use a different email or try signing in.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/operation-not-allowed":
            errorMessage =
              "Email/password accounts are not enabled. Please contact support.";
            break;
          case "auth/weak-password":
            errorMessage =
              "Password is too weak. Please choose a stronger password.";
            break;
          case "auth/network-request-failed":
            errorMessage =
              "Network error. Please check your internet connection and try again.";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Too many unsuccessful attempts. Please try again later.";
            break;
          case "auth/api-key-not-valid":
            errorMessage = "Invalid API configuration. Please contact support.";
            break;
          default:
            errorMessage = error.message || "Registration failed";
        }
      } else {
        errorMessage = error.message || "Registration failed";
      }

      throw new Error(errorMessage);
    }
  }
  static async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      const userDoc = await getDoc(
        doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid)
      );
      if (!userDoc.exists()) {
        throw new Error("User data not found");
      }

      const userData = userDoc.data();
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

      // Provide more specific error messages based on Firebase error codes
      let errorMessage = "Login failed";

      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
            errorMessage =
              "No account found with this email address. Please check your email or register a new account.";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password. Please try again.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/user-disabled":
            errorMessage =
              "This account has been disabled. Please contact support.";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Too many unsuccessful attempts. Please try again later.";
            break;
          case "auth/network-request-failed":
            errorMessage =
              "Network error. Please check your internet connection and try again.";
            break;
          default:
            errorMessage = error.message || "Login failed";
        }
      } else {
        errorMessage = error.message || "Login failed";
      }

      throw new Error(errorMessage);
    }
  }

  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || "Logout failed");
    }
  }

  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || "Password reset failed");
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userDoc = await getDoc(
        doc(db, FIREBASE_COLLECTIONS.USERS, firebaseUser.uid)
      );
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
  static async createBusiness(
    businessData: Omit<Business, "id" | "createdAt">
  ): Promise<Business> {
    try {
      console.log("Creating business with data:", businessData);

      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("User must be authenticated to create a business");
      }

      // Filter out undefined values as Firestore doesn't accept them
      const cleanData = Object.fromEntries(
        Object.entries(businessData).filter(
          ([_, value]) => value !== undefined && value !== ""
        )
      );

      console.log("Cleaned business data:", cleanData);

      const docRef = await addDoc(
        collection(db, FIREBASE_COLLECTIONS.BUSINESSES),
        {
          ...cleanData,
          createdAt: Timestamp.now(),
        }
      );

      console.log("Business created successfully with ID:", docRef.id);

      return {
        id: docRef.id,
        ...businessData,
        createdAt: new Date(),
      };
    } catch (error: any) {
      console.error("Failed to create business:", error);

      // Provide more specific error messages
      if (error.code) {
        switch (error.code) {
          case "permission-denied":
            throw new Error(
              "Permission denied. Please check Firestore security rules."
            );
          case "unauthenticated":
            throw new Error(
              "Authentication required. Please log in and try again."
            );
          case "not-found":
            throw new Error(
              "Firestore database not found. Please check Firebase configuration."
            );
          case "unavailable":
            throw new Error(
              "Firestore service is temporarily unavailable. Please try again."
            );
          default:
            throw new Error(
              `Firestore error (${error.code}): ${error.message}`
            );
        }
      }

      throw new Error(error.message || "Failed to create business");
    }
  }

  static async getBusinessByOwnerId(ownerId: string): Promise<Business | null> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.BUSINESSES),
        where("ownerId", "==", ownerId),
        limit(1)
      );
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
      throw new Error(error.message || "Failed to get business");
    }
  }
  static async updateBusiness(
    businessId: string,
    updates: Partial<Business>
  ): Promise<void> {
    try {
      console.log("Updating business with ID:", businessId);
      console.log("Update data:", updates);

      // Filter out undefined values and id/createdAt fields that shouldn't be updated
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(
          ([key, value]) =>
            value !== undefined &&
            value !== "" &&
            key !== "id" &&
            key !== "createdAt"
        )
      );

      console.log("Cleaned update data:", cleanUpdates);

      await updateDoc(
        doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId),
        cleanUpdates
      );
      console.log("Business updated successfully");
    } catch (error: any) {
      console.error("Failed to update business:", error);

      // Provide more specific error messages
      if (error.code) {
        switch (error.code) {
          case "permission-denied":
            throw new Error(
              "Permission denied. Please check Firestore security rules."
            );
          case "unauthenticated":
            throw new Error(
              "Authentication required. Please log in and try again."
            );
          case "not-found":
            throw new Error("Business not found. It may have been deleted.");
          case "unavailable":
            throw new Error(
              "Firestore service is temporarily unavailable. Please try again."
            );
          default:
            throw new Error(
              `Firestore error (${error.code}): ${error.message}`
            );
        }
      }

      throw new Error(error.message || "Failed to update business");
    }
  }
  static async getAllBusinesses(): Promise<Business[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.BUSINESSES),
        where("isActive", "==", true),
        orderBy("name")
      );
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
      throw new Error(error.message || "Failed to get businesses");
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
      throw new Error(error.message || "Failed to get business");
    }
  }
  static async getBusinessesByOwner(ownerId: string): Promise<Business[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.BUSINESSES),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc")
      );
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
      throw new Error(error.message || "Failed to get businesses by owner");
    }
  }
}

// Loyalty Card Service
export class LoyaltyCardService {
  static async createLoyaltyCard(
    cardData: Omit<LoyaltyCard, "id" | "createdAt">
  ): Promise<LoyaltyCard> {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("User must be authenticated to create a loyalty card");
      }

      console.log("Creating loyalty card with data:", cardData);
      console.log(
        "Current user:",
        auth.currentUser.uid,
        auth.currentUser.email
      );

      // Filter out undefined values as Firestore doesn't accept them
      const cleanData = Object.fromEntries(
        Object.entries(cardData).filter(
          ([_, value]) => value !== undefined && value !== ""
        )
      );

      console.log("Cleaned loyalty card data:", cleanData);

      const docRef = await addDoc(
        collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS),
        {
          ...cleanData,
          ownerId: auth.currentUser.uid, // Add the current user's ID as owner
          createdAt: Timestamp.now(),
        }
      );

      console.log("Loyalty card created successfully with ID:", docRef.id);

      return {
        id: docRef.id,
        ...cardData,
        createdAt: new Date(),
      };
    } catch (error: any) {
      console.error("Failed to create loyalty card:", error);

      // Provide more specific error messages
      if (error.code) {
        switch (error.code) {
          case "permission-denied":
            throw new Error(
              "Permission denied. Please check your authentication status or contact support."
            );
          case "unauthenticated":
            throw new Error("You must be logged in to create a loyalty card.");
          case "invalid-argument":
            throw new Error(
              "Invalid data provided. Please check all required fields."
            );
          default:
            throw new Error(
              `Firestore error (${error.code}): ${error.message}`
            );
        }
      }

      throw new Error(error.message || "Failed to create loyalty card");
    }
  }

  static async getLoyaltyCardByBusinessId(
    businessId: string
  ): Promise<LoyaltyCard | null> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS),
        where("businessId", "==", businessId),
        where("isActive", "==", true),
        orderBy("createdAt", "desc"),
        limit(1)
      );
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
        stampDescription: data.stampDescription,
        cardColor: data.cardColor,
        createdAt: data.createdAt.toDate(),
        isActive: data.isActive,
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to get loyalty card");
    }
  }

  static async getLoyaltyCardsByBusinessId(
    businessId: string
  ): Promise<LoyaltyCard[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS),
        where("businessId", "==", businessId),
        orderBy("createdAt", "desc")
      );
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
          stampDescription: data.stampDescription,
          cardColor: data.cardColor,
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to get loyalty cards");
    }
  }

  static async getAllActiveLoyaltyCards(): Promise<LoyaltyCard[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS),
        where("isActive", "==", true),
        orderBy("businessName")
      );
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
          stampDescription: data.stampDescription,
          cardColor: data.cardColor,
          createdAt: data.createdAt.toDate(),
          isActive: data.isActive,
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to get loyalty cards");
    }
  }

  static async updateLoyaltyCard(
    cardId: string,
    updates: Partial<LoyaltyCard>
  ): Promise<void> {
    try {
      await updateDoc(
        doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId),
        updates
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to update loyalty card");
    }
  }

  static async deleteLoyaltyCard(cardId: string): Promise<void> {
    try {
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId), {
        isActive: false,
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete loyalty card");
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
        stampDescription: data.stampDescription,
        cardColor: data.cardColor,
        createdAt: data.createdAt.toDate(),
        isActive: data.isActive,
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to get loyalty card");
    }
  }

  static async getLoyaltyCardsByBusiness(
    businessId: string
  ): Promise<LoyaltyCard[]> {
    return this.getLoyaltyCardsByBusinessId(businessId);
  }
}

// Customer Card Service
export class CustomerCardService {
  static async joinLoyaltyProgram(
    customerId: string,
    loyaltyCardId: string,
    cardCode?: string
  ): Promise<CustomerCard> {
    try {
      // Check if customer already has this card
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("customerId", "==", customerId),
        where("loyaltyCardId", "==", loyaltyCardId),
        limit(1)
      );
      const existingCards = await getDocs(q);

      if (!existingCards.empty) {
        throw new Error("You are already enrolled in this loyalty program");
      }

      // Get customer name from the Users collection (customer can read their own data)
      let customerName = "";
      try {
        const userDoc = await getDoc(
          doc(db, FIREBASE_COLLECTIONS.USERS, customerId)
        );
        if (userDoc.exists()) {
          const userData = userDoc.data();
          customerName = userData.displayName || "";
        }
      } catch (error) {
        console.warn(
          "Could not fetch customer name during card creation:",
          error
        );
        // Continue without customer name if fetch fails
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

      const docRef = await addDoc(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        customerCardData
      );

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
      throw new Error(error.message || "Failed to join loyalty program");
    }
  }

  static async getCustomerCards(customerId: string): Promise<CustomerCard[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc")
      );
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
          const loyaltyCardDoc = await getDoc(
            doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId)
          );
          if (loyaltyCardDoc.exists()) {
            const loyaltyCardData = loyaltyCardDoc.data();
            customerCard.loyaltyCard = {
              id: loyaltyCardDoc.id,
              businessId: loyaltyCardData.businessId,
              businessName: loyaltyCardData.businessName,
              businessLogo: loyaltyCardData.businessLogo,
              totalSlots: loyaltyCardData.totalSlots,
              rewardDescription: loyaltyCardData.rewardDescription,
              stampDescription: loyaltyCardData.stampDescription,
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
      throw new Error(error.message || "Failed to get customer cards");
    }
  }
  static async addStamp(
    customerCardId: string,
    customerId: string,
    businessId: string,
    loyaltyCardId: string
  ): Promise<void> {
    try {
      // Get current customer card
      const customerCardDoc = await getDoc(
        doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId)
      );
      if (!customerCardDoc.exists()) {
        throw new Error("Customer card not found");
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
      await updateDoc(
        doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId),
        {
          currentStamps: newStampCount,
          lastStampDate: Timestamp.now(),
        }
      );

      // Create stamp activity record
      await StampActivityService.createStampActivity(
        customerCardId,
        customerId,
        businessId,
        loyaltyCardId,
        newStampCount,
        "Stamp added"
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to add stamp");
    }
  }

  static async claimReward(customerCardId: string): Promise<void> {
    try {
      await updateDoc(
        doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId),
        {
          isRewardClaimed: true,
          currentStamps: 0, // Reset stamps after claiming reward
        }
      );

      // Add reward record
      const customerCardDoc = await getDoc(
        doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId)
      );
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
      throw new Error(error.message || "Failed to claim reward");
    }
  }

  static async getCustomerCard(
    customerCardId: string
  ): Promise<CustomerCard | null> {
    try {
      const docRef = doc(
        db,
        FIREBASE_COLLECTIONS.CUSTOMER_CARDS,
        customerCardId
      );
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
      const loyaltyCardDoc = await getDoc(
        doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId)
      );
      if (loyaltyCardDoc.exists()) {
        const loyaltyCardData = loyaltyCardDoc.data();
        customerCard.loyaltyCard = {
          id: loyaltyCardDoc.id,
          businessId: loyaltyCardData.businessId,
          businessName: loyaltyCardData.businessName,
          businessLogo: loyaltyCardData.businessLogo,
          totalSlots: loyaltyCardData.totalSlots,
          rewardDescription: loyaltyCardData.rewardDescription,
          stampDescription: loyaltyCardData.stampDescription,
          cardColor: loyaltyCardData.cardColor,
          createdAt: loyaltyCardData.createdAt.toDate(),
          isActive: loyaltyCardData.isActive,
        };
      }

      return customerCard;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get customer card");
    }
  }
  static async getCustomerCardsByLoyaltyCard(
    loyaltyCardId: string
  ): Promise<CustomerCard[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("loyaltyCardId", "==", loyaltyCardId),
        orderBy("createdAt", "desc")
      );
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
      throw new Error(
        error.message || "Failed to get customer cards by loyalty card"
      );
    }
  }

  static async getCustomerCardByCode(
    cardCode: string,
    loyaltyCardId: string
  ): Promise<CustomerCard | null> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("cardCode", "==", cardCode),
        where("loyaltyCardId", "==", loyaltyCardId),
        limit(1)
      );
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
      };

      // Get loyalty card details
      const loyaltyCardDoc = await getDoc(
        doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, data.loyaltyCardId)
      );
      if (loyaltyCardDoc.exists()) {
        const loyaltyCardData = loyaltyCardDoc.data();
        customerCard.loyaltyCard = {
          id: loyaltyCardDoc.id,
          businessId: loyaltyCardData.businessId,
          businessName: loyaltyCardData.businessName,
          businessLogo: loyaltyCardData.businessLogo,
          totalSlots: loyaltyCardData.totalSlots,
          rewardDescription: loyaltyCardData.rewardDescription,
          stampDescription: loyaltyCardData.stampDescription,
          cardColor: loyaltyCardData.cardColor,
          createdAt: loyaltyCardData.createdAt.toDate(),
          isActive: loyaltyCardData.isActive,
        };
      }

      return customerCard;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get customer card by code");
    }
  }

  static async addStampByCardCode(
    cardCode: string,
    loyaltyCardId: string
  ): Promise<void> {
    try {
      // Find customer card by card code
      const customerCard = await this.getCustomerCardByCode(
        cardCode,
        loyaltyCardId
      );
      if (!customerCard) {
        throw new Error("Customer card not found with this card code");
      }

      // Get loyalty card to get business ID
      const loyaltyCardDoc = await getDoc(
        doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, loyaltyCardId)
      );
      if (!loyaltyCardDoc.exists()) {
        throw new Error("Loyalty card not found");
      }

      const loyaltyCardData = loyaltyCardDoc.data();
      const businessId = loyaltyCardData.businessId;

      // Add stamp
      await this.addStamp(
        customerCard.id,
        customerCard.customerId,
        businessId,
        loyaltyCardId
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to add stamp by card code");
    }
  }
}

// Stamp Activity Service
export class StampActivityService {
  static async createStampActivity(
    customerCardId: string,
    customerId: string,
    businessId: string,
    loyaltyCardId: string,
    stampCount: number,
    note?: string
  ): Promise<StampActivity> {
    try {
      // Get customer and business names for the activity record
      let customerName = "";
      let businessName = "";

      try {
        const [userDoc, businessDoc] = await Promise.all([
          getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, customerId)),
          getDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId)),
        ]);

        if (userDoc.exists()) {
          customerName = userDoc.data().displayName || "";
        }
        if (businessDoc.exists()) {
          businessName = businessDoc.data().name || "";
        }
      } catch (error) {
        console.warn("Could not fetch names for stamp activity:", error);
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

      const docRef = await addDoc(
        collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY),
        stampActivityData
      );

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
      throw new Error(error.message || "Failed to create stamp activity");
    }
  }

  static async getStampActivitiesByBusiness(
    businessId: string
  ): Promise<StampActivity[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY),
        where("businessId", "==", businessId),
        orderBy("timestamp", "desc")
      );
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
      throw new Error(error.message || "Failed to get stamp activities");
    }
  }

  static async getStampActivitiesByCustomerCard(
    customerCardId: string
  ): Promise<StampActivity[]> {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY),
        where("customerCardId", "==", customerCardId),
        orderBy("timestamp", "desc")
      );
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
      throw new Error(
        error.message || "Failed to get stamp activities for customer card"
      );
    }
  }
}
