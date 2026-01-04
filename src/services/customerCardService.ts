import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, auth } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { Business, CustomerCard } from "../types";
import { generateUniqueCardCode } from "../utils/cardCodeUtils";
import { BusinessService } from "./businessService";
import { StampActivityService } from "./stampActivityService";
import { NotificationService, StampNotificationData } from "./notificationService";
import { SoundService } from "./soundService";
import { UserService } from "./userService";
import { handleFirestoreError } from "./utils";

export class CustomerCardService {
  static async joinLoyaltyProgram(customerId: string, loyaltyCardId: string): Promise<CustomerCard & { cardCode: string }> {
    try {
      // 1. Check if already joined (this query is allowed as it filters by OWN customerId)
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("customerId", "==", customerId),
        where("loyaltyCardId", "==", loyaltyCardId),
        where("isRewardClaimed", "==", false),
        limit(1)
      );
      const existingCards = await getDocs(q);
      if (!existingCards.empty) throw new Error("Ya estás inscrito en este programa de fidelidad");

      // 2. Validate Loyalty Card and Business
      const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, loyaltyCardId));
      if (!loyaltyCardDoc.exists()) throw new Error("Tarjeta de fidelidad no encontrada");
      const loyaltyCardData = loyaltyCardDoc.data();
      const businessId = loyaltyCardData.businessId as string | null | undefined;

      if (!businessId) {
        throw new Error("Esta tarjeta de fidelidad no tiene un negocio asociado todavía.");
      }
      const businessDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId));
      if (!businessDoc.exists()) {
        throw new Error("El negocio asociado a esta tarjeta no existe.");
      }

      let customerName = "";
      try {
        const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, customerId));
        if (userDoc.exists()) customerName = userDoc.data().displayName || "";
      } catch {}

      // 3. Generate a Code using "takenCodes" check
      // We pass a checker that uses the PUBLIC takenCodes collection
      const cardCode = await generateUniqueCardCode(businessId, customerId, async (code, bId) => {
        const takenRef = doc(db, `businesses/${bId}/takenCodes/${code}`);
        const snap = await getDoc(takenRef);
        return snap.exists();
      });

      // 4. Transactional Create: Card + TakenCode reservation
      const result = await runTransaction(db, async (tx) => {
        const takenCodeRef = doc(db, `businesses/${businessId}/takenCodes/${cardCode}`);
        const takenSnap = await tx.get(takenCodeRef);
        if (takenSnap.exists()) {
          throw new Error("RETRY_CODE_GENERATION"); // Signal to retry
        }

        const newCardRef = doc(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS));
        
        const customerCardData = {
          customerId,
          loyaltyCardId,
          businessId,
          currentStamps: 0,
          isRewardClaimed: false,
          createdAt: serverTimestamp(),
          customerName,
          cardCode,
        };

        // Reserve the code
        tx.set(takenCodeRef, {
          customerId,
          createdAt: serverTimestamp(),
          cardId: newCardRef.id
        });

        // Create the card
        tx.set(newCardRef, customerCardData);

        return {
          id: newCardRef.id,
          ...customerCardData,
          createdAt: new Date()
        };
      });

      return result as CustomerCard & { cardCode: string };

    } catch (error: any) {
      console.error("❌ DEBUG - joinLoyaltyProgram error", { error: error.message, code: error?.code, customerId, loyaltyCardId });
      
      if (error.message === "RETRY_CODE_GENERATION") {
        // Simple recursion for retry (should be rare with 3 digits for small businesses, but possible)
        return this.joinLoyaltyProgram(customerId, loyaltyCardId);
      }

      const code = error?.code || error?.name;
      if (code === "permission-denied") {
        throw new Error(
          "No tienes permisos para unirte a esta tarjeta. Verifica tu conexión e inténtalo de nuevo."
        );
      }
      throw new Error(error.message || "Error al unirse al programa de fidelidad");
    }
  }

  static async getAllCustomerCards(customerId: string): Promise<CustomerCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("customerId", "==", customerId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const loyaltyCardIds = new Set<string>();
      const businessIds = new Set<string>();
      querySnapshot.docs.forEach((d) => {
        const data: any = d.data();
        if (data.loyaltyCardId) loyaltyCardIds.add(data.loyaltyCardId);
        if (data.businessId) businessIds.add(data.businessId);
      });

      const loyaltyCardsMap = new Map<string, any>();
      await Promise.all(
        Array.from(loyaltyCardIds).map(async (lid) => {
          try {
            const snap = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, lid));
            if (snap.exists()) {
              const ld = snap.data();
              loyaltyCardsMap.set(lid, ld);
              if (!businessIds.has(ld.businessId)) businessIds.add(ld.businessId);
            }
          } catch (e) {
            console.warn("getAllCustomerCards: failed loyaltyCard fetch", lid, e);
          }
        })
      );

      const businessesMap = new Map<string, any>();
      await Promise.all(
        Array.from(businessIds).map(async (bid) => {
          try {
            const biz = await BusinessService.getBusiness(bid);
            if (biz) businessesMap.set(bid, biz);
          } catch (e) {
            console.warn("getAllCustomerCards: failed business fetch", bid, e);
          }
        })
      );

      const customerCards: CustomerCard[] = querySnapshot.docs.map((docSnapshot) => {
        const data: any = docSnapshot.data();
        const loyaltyRaw = loyaltyCardsMap.get(data.loyaltyCardId);
        const business: Business | undefined = loyaltyRaw ? businessesMap.get(loyaltyRaw.businessId) : businessesMap.get(data.businessId);
        const customerCard: CustomerCard = {
          id: docSnapshot.id,
          customerId: data.customerId,
          loyaltyCardId: data.loyaltyCardId,
          businessId: (data.businessId || loyaltyRaw?.businessId || "") as string,
          currentStamps: data.currentStamps,
          isRewardClaimed: data.isRewardClaimed,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          lastStampDate: data.lastStampDate?.toDate ? data.lastStampDate.toDate() : undefined,
          cardCode: data.cardCode,
          customerName: data.customerName,
        };
        if (loyaltyRaw) {
          customerCard.loyaltyCard = {
            id: data.loyaltyCardId,
            businessId: loyaltyRaw.businessId,
            businessName: business?.name || "",
            businessLogo: business?.logoUrl,
            totalSlots: loyaltyRaw.totalSlots,
            rewardDescription: loyaltyRaw.rewardDescription,
            cardColor: loyaltyRaw.cardColor,
            stampShape: loyaltyRaw.stampShape,
            backgroundImage: loyaltyRaw.backgroundImage,
            createdAt: loyaltyRaw.createdAt?.toDate ? loyaltyRaw.createdAt.toDate() : new Date(),
            isActive: loyaltyRaw.isActive,
          };
        }
        return customerCard;
      });

      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener todas las tarjetas del cliente");
    }
  }

  static async getUnclaimedRewardCustomerCards(customerId: string): Promise<CustomerCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("customerId", "==", customerId), where("isRewardClaimed", "==", false), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const loyaltyCardIds = new Set<string>();
      const businessIds = new Set<string>();
      querySnapshot.docs.forEach((d) => {
        const data: any = d.data();
        if (data.loyaltyCardId) loyaltyCardIds.add(data.loyaltyCardId);
        if (data.businessId) businessIds.add(data.businessId);
      });

      const loyaltyCardsMap = new Map<string, any>();
      await Promise.all(
        Array.from(loyaltyCardIds).map(async (lid) => {
          try {
            const snap = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, lid));
            if (snap.exists()) {
              const ld = snap.data();
              loyaltyCardsMap.set(lid, ld);
              if (!businessIds.has(ld.businessId)) businessIds.add(ld.businessId);
            }
          } catch (e) {
            console.warn("getUnclaimedRewardCustomerCards: failed loyaltyCard fetch", lid, e);
          }
        })
      );

      const businessesMap = new Map<string, Business>();
      await Promise.all(
        Array.from(businessIds).map(async (bid) => {
          try {
            const biz = await BusinessService.getBusiness(bid);
            if (biz) businessesMap.set(bid, biz);
          } catch (e) {
            console.warn("getUnclaimedRewardCustomerCards: failed business fetch", bid, e);
          }
        })
      );

      const customerCards: CustomerCard[] = querySnapshot.docs.map((docSnapshot) => {
        const data: any = docSnapshot.data();
        const loyaltyRaw = loyaltyCardsMap.get(data.loyaltyCardId);
        const business: Business | undefined = loyaltyRaw ? businessesMap.get(loyaltyRaw.businessId) : businessesMap.get(data.businessId);
        const customerCard: CustomerCard = {
          id: docSnapshot.id,
          customerId: data.customerId,
          loyaltyCardId: data.loyaltyCardId,
          businessId: (data.businessId || loyaltyRaw?.businessId || "") as string,
          currentStamps: data.currentStamps,
          isRewardClaimed: data.isRewardClaimed,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          lastStampDate: data.lastStampDate?.toDate ? data.lastStampDate.toDate() : undefined,
          cardCode: data.cardCode,
          customerName: data.customerName,
        };
        if (loyaltyRaw) {
          customerCard.loyaltyCard = {
            id: data.loyaltyCardId,
            businessId: loyaltyRaw.businessId,
            businessName: business?.name || "",
            businessLogo: business?.logoUrl,
            totalSlots: loyaltyRaw.totalSlots,
            rewardDescription: loyaltyRaw.rewardDescription,
            cardColor: loyaltyRaw.cardColor,
            stampShape: loyaltyRaw.stampShape,
            backgroundImage: loyaltyRaw.backgroundImage,
            createdAt: loyaltyRaw.createdAt?.toDate ? loyaltyRaw.createdAt.toDate() : new Date(),
            isActive: loyaltyRaw.isActive,
          };
        }
        return customerCard;
      });

      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las tarjetas del cliente");
    }
  }

  static async addStamp(customerCardId: string, customerId: string, businessId: string, loyaltyCardId: string): Promise<void> {
    try {
      const result = await runTransaction(db, async (tx) => {
        const cardRef = doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId);
        const loyaltyCardRef = doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, loyaltyCardId);
        const businessRef = doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId);
        const [cardSnap, loyaltySnap, businessSnap] = await Promise.all([tx.get(cardRef), tx.get(loyaltyCardRef), tx.get(businessRef)]);
        if (!cardSnap.exists()) throw new Error("Tarjeta de cliente no encontrada");
        if (!loyaltySnap.exists()) throw new Error("Tarjeta de lealtad no encontrada");
        const cardData: any = cardSnap.data();
        const loyaltyData: any = loyaltySnap.data();
        const newStampCount = (cardData.currentStamps || 0) + 1;
        const totalSlots = loyaltyData.totalSlots;
        const isCompleted = newStampCount >= totalSlots;

        tx.update(cardRef, { currentStamps: increment(1), lastStampDate: serverTimestamp() });
        const stampRef = doc(collection(db, FIREBASE_COLLECTIONS.STAMPS));
        tx.set(stampRef, { customerCardId, customerId, businessId, loyaltyCardId, timestamp: serverTimestamp() });

        return { newStampCount, totalSlots, isCompleted, customerName: cardData.customerName || "", businessName: businessSnap.exists() ? (businessSnap.data() as any).name : "el negocio" };
      });

      await StampActivityService.createStampActivity(customerCardId, customerId, businessId, loyaltyCardId, result.newStampCount, "Sello agregado");

      const notificationData: StampNotificationData = {
        customerName: result.customerName,
        businessName: result.businessName,
        currentStamps: result.newStampCount,
        totalSlots: result.totalSlots,
        isCompleted: result.isCompleted,
      };

      try {
        try {
          const customerUser = await UserService.getUser(customerId);
          if (customerUser?.pushToken) {
            await NotificationService.sendStampNotificationViaPush([customerUser.pushToken], notificationData);
          }
        } catch (pushErr) {
          console.warn("addStamp: push notification error", pushErr);
        }
        if (!result.isCompleted) {
          await SoundService.playSuccessSound();
        }
      } catch (notifErr) {
        console.warn("addStamp: notification/sound error", notifErr);
      }
    } catch (error: any) {
      handleFirestoreError(error, "agregar sello");
      throw error;
    }
  }

  static async getCustomerCard(customerCardId: string): Promise<CustomerCard | null> {
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      const customerCard: CustomerCard = {
        id: docSnap.id,
        customerId: data.customerId,
        loyaltyCardId: data.loyaltyCardId,
        businessId: data.businessId || "",
        currentStamps: data.currentStamps,
        isRewardClaimed: data.isRewardClaimed,
        createdAt: data.createdAt.toDate(),
        lastStampDate: data.lastStampDate?.toDate(),
        cardCode: data.cardCode,
        customerName: data.customerName,
      };

      let loyaltyData: any | null = null;
      let business: Business | null | undefined = null;
      try {
        if (customerCard.businessId) {
          const [loyaltySnap, businessObj] = await Promise.all([getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, customerCard.loyaltyCardId)), BusinessService.getBusiness(customerCard.businessId)]);
          if (loyaltySnap.exists()) loyaltyData = loyaltySnap.data();
          business = businessObj;
        } else {
          const loyaltySnap = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, customerCard.loyaltyCardId));
          if (loyaltySnap.exists()) {
            loyaltyData = loyaltySnap.data();
            customerCard.businessId = loyaltyData.businessId;
            business = await BusinessService.getBusiness(loyaltyData.businessId);
          }
        }
      } catch (e) {
        console.warn("getCustomerCard: enrichment failed", e);
      }

      if (loyaltyData) {
        customerCard.loyaltyCard = {
          id: customerCard.loyaltyCardId,
          businessId: loyaltyData.businessId,
          businessName: business?.name || "",
          businessLogo: business?.logoUrl,
          totalSlots: loyaltyData.totalSlots,
          rewardDescription: loyaltyData.rewardDescription,
          cardColor: loyaltyData.cardColor,
          stampShape: loyaltyData.stampShape,
          backgroundImage: loyaltyData.backgroundImage,
          createdAt: loyaltyData.createdAt?.toDate ? loyaltyData.createdAt.toDate() : new Date(),
          isActive: loyaltyData.isActive,
        };
      }

      return customerCard;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener la tarjeta del cliente");
    }
  }

  static async getCustomerCardsByBusiness(customerId: string, businessId: string): Promise<CustomerCard[]> {
    try {
      const loyaltyCardsQuery = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "==", businessId), where("isActive", "==", true));
      const loyaltyCardsSnapshot = await getDocs(loyaltyCardsQuery);
      const loyaltyCardIds = loyaltyCardsSnapshot.docs.map((doc) => doc.id);
      if (loyaltyCardIds.length === 0) return [];
      const customerCardsQuery = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("customerId", "==", customerId),
        where("loyaltyCardId", "in", loyaltyCardIds),
        where("isRewardClaimed", "==", false),
        orderBy("createdAt", "desc")
      );
      const customerCardsSnapshot = await getDocs(customerCardsQuery);
      const business = await BusinessService.getBusiness(businessId);
      const loyaltyMap = new Map<string, any>();
      loyaltyCardsSnapshot.docs.forEach((d) => loyaltyMap.set(d.id, d.data()));
      const customerCards: CustomerCard[] = customerCardsSnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        const base: CustomerCard = {
          id: docSnapshot.id,
          customerId: data.customerId,
          loyaltyCardId: data.loyaltyCardId,
          businessId: data.businessId || businessId,
          currentStamps: data.currentStamps,
          isRewardClaimed: data.isRewardClaimed,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          lastStampDate: data.lastStampDate?.toDate ? data.lastStampDate.toDate() : undefined,
          cardCode: data.cardCode,
          customerName: data.customerName,
        };
        const loyaltyRaw = loyaltyMap.get(data.loyaltyCardId);
        if (loyaltyRaw) {
          base.loyaltyCard = {
            id: data.loyaltyCardId,
            businessId: loyaltyRaw.businessId,
            businessName: business?.name || "",
            businessLogo: business?.logoUrl,
            totalSlots: loyaltyRaw.totalSlots,
            rewardDescription: loyaltyRaw.rewardDescription,
            cardColor: loyaltyRaw.cardColor,
            stampShape: loyaltyRaw.stampShape,
            backgroundImage: loyaltyRaw.backgroundImage,
            createdAt: loyaltyRaw.createdAt?.toDate ? loyaltyRaw.createdAt.toDate() : new Date(),
            isActive: loyaltyRaw.isActive,
          };
        }
        return base;
      });
      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las tarjetas del cliente para el negocio");
    }
  }

  static async getActiveCustomerCardsWithUnclaimedRewards(loyaltyCardId: string): Promise<CustomerCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("loyaltyCardId", "==", loyaltyCardId), where("isRewardClaimed", "==", false), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const customerCards = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const customerCard: CustomerCard = {
            id: docSnapshot.id,
            customerId: data.customerId,
            loyaltyCardId: data.loyaltyCardId,
            businessId: data.businessId || "",
            currentStamps: data.currentStamps,
            isRewardClaimed: data.isRewardClaimed,
            createdAt: data.createdAt.toDate(),
            lastStampDate: data.lastStampDate?.toDate(),
            cardCode: data.cardCode,
            customerName: data.customerName,
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
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("cardCode", "==", cardCode), where("businessId", "==", businessId), where("isRewardClaimed", "==", false), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
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

  static async addStampByCardCodeAndBusiness(cardCode: string, businessId: string, count: number = 1): Promise<void> {
    try {
      const customerCard = await this.getUnclaimedCustomerCardByCodeAndBusiness(cardCode, businessId);
      if (!customerCard) throw new Error("Tarjeta de cliente no encontrada con este código para este negocio");

      // Clamp count >= 1
      const addCount = Math.max(1, Math.floor(count));

      if (addCount === 1) {
        await this.addStamp(customerCard.id, customerCard.customerId, businessId, customerCard.loyaltyCardId);
        return;
      }

      // Bulk path: single transaction for multiple stamps
      const result = await runTransaction(db, async (tx) => {
        const cardRef = doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCard.id);
        const loyaltyRef = doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, customerCard.loyaltyCardId);
        const businessRef = doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId);

        const [cardSnap, loyaltySnap, businessSnap] = await Promise.all([tx.get(cardRef), tx.get(loyaltyRef), tx.get(businessRef)]);
        if (!cardSnap.exists()) throw new Error("Tarjeta de cliente no encontrada");
        if (!loyaltySnap.exists()) throw new Error("Tarjeta de lealtad no encontrada");
        const cardData: any = cardSnap.data();
        const loyaltyData: any = loyaltySnap.data();

        const current = cardData.currentStamps || 0;
        const totalSlots = loyaltyData.totalSlots as number;
        const remaining = Math.max(0, totalSlots - current);
        const toAdd = Math.min(remaining, addCount);
        if (toAdd <= 0) {
          return {
            newStampCount: current,
            totalSlots,
            isCompleted: current >= totalSlots,
            toAdd: 0,
            customerName: cardData.customerName || "",
            businessName: businessSnap.exists() ? (businessSnap.data() as any).name : "el negocio",
          };
        }

        // Increment count
        tx.update(cardRef, { currentStamps: increment(toAdd), lastStampDate: serverTimestamp() });
        // Create N stamp docs
        for (let i = 0; i < toAdd; i++) {
          const stampRef = doc(collection(db, FIREBASE_COLLECTIONS.STAMPS));
          tx.set(stampRef, {
            customerCardId: customerCard.id,
            customerId: customerCard.customerId,
            businessId,
            loyaltyCardId: customerCard.loyaltyCardId,
            timestamp: serverTimestamp(),
          });
        }

        const newStampCount = current + toAdd;
        const isCompleted = newStampCount >= totalSlots;
        return { newStampCount, totalSlots, isCompleted, toAdd, customerName: cardData.customerName || "", businessName: businessSnap.exists() ? (businessSnap.data() as any).name : "el negocio" };
      });

      // Activity with final count
      await StampActivityService.createStampActivity(customerCard.id, customerCard.customerId, businessId, customerCard.loyaltyCardId, result.newStampCount, `Se agregaron ${result.toAdd} sello(s)`);

      const notificationData: StampNotificationData = {
        customerName: result.customerName,
        businessName: result.businessName,
        currentStamps: result.newStampCount,
        totalSlots: result.totalSlots,
        isCompleted: result.isCompleted,
      };
      try {
        try {
          const customerUser = await UserService.getUser(customerCard.customerId);
          if (customerUser?.pushToken) {
            await NotificationService.sendStampNotificationViaPush([customerUser.pushToken], notificationData);
          }
        } catch (pushErr) {
          console.warn("addStampByCardCodeAndBusiness(bulk): push notification error", pushErr);
        }
        if (!result.isCompleted) {
          await SoundService.playSuccessSound();
        }
      } catch (notifErr) {
        console.warn("addStampByCardCodeAndBusiness(bulk): notification/sound error", notifErr);
      }
    } catch (error: any) {
      throw new Error(error.message || "Error al agregar sellos por código de tarjeta y negocio");
    }
  }

  static async claimRewardByCardCodeAndBusiness(cardCode: string, businessId: string): Promise<void> {
    try {
      const customerCard = await this.getUnclaimedCustomerCardByCodeAndBusiness(cardCode, businessId);
      if (!customerCard) throw new Error("Tarjeta de cliente no encontrada con este código para este negocio");
      if (!customerCard.loyaltyCard) throw new Error("Información de tarjeta de lealtad no encontrada");
      await runTransaction(db, async (tx) => {
        const cardRef = doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCard.id);
        const cardSnap = await tx.get(cardRef);
        if (!cardSnap.exists()) throw new Error("Tarjeta de cliente no encontrada");
        const data: any = cardSnap.data();
        if (data.isRewardClaimed) throw new Error("La recompensa ya fue canjeada");
        const currentStamps = data.currentStamps || 0;
        const required = customerCard.loyaltyCard!.totalSlots;
        if (currentStamps < required) throw new Error("La tarjeta no tiene suficientes sellos para canjear la recompensa");
        tx.update(cardRef, { isRewardClaimed: true, rewardClaimedAt: serverTimestamp() });
        const rewardRef = doc(collection(db, FIREBASE_COLLECTIONS.REWARDS));
        tx.set(rewardRef, {
          customerCardId: customerCard.id,
          customerId: customerCard.customerId,
          businessId,
          loyaltyCardId: customerCard.loyaltyCardId,
          claimedAt: serverTimestamp(),
          isRedeemed: true,
          note: "Recompensa canjeada por el negocio",
        });
      });
      await StampActivityService.createStampActivity(customerCard.id, customerCard.customerId, businessId, customerCard.loyaltyCardId, customerCard.loyaltyCard.totalSlots, "Recompensa canjeada");
      try {
        const businessDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId));
        const businessName = businessDoc.exists() ? (businessDoc.data() as any).name : "el negocio";
        await NotificationService.sendRewardRedeemedNotification(businessName);
        try {
          const customerUser = await UserService.getUser(customerCard.customerId);
          if (customerUser?.pushToken) {
            await NotificationService.sendPushNotification(
              [customerUser.pushToken],
              "🎁 ¡Recompensa Canjeada!",
              `¡Has canjeado exitosamente tu recompensa en ${businessName}! ¡Gracias por tu lealtad!`,
              { businessName, type: "reward_redeemed" }
            );
          }
        } catch (pushErr) {
          console.warn("claimReward: push notification error", pushErr);
        }
      } catch (notifErr) {
        console.warn("claimReward: notification/sound error", notifErr);
      }
    } catch (error: any) {
      throw new Error(error.message || "Error al canjear recompensa por código de tarjeta y negocio");
    }
  }

  static async getAllCustomerCardsByLoyaltyCard(loyaltyCardId: string): Promise<CustomerCard[]> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("loyaltyCardId", "==", loyaltyCardId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const customerCards = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const customerCard: CustomerCard = {
            id: docSnapshot.id,
            customerId: data.customerId,
            loyaltyCardId: data.loyaltyCardId,
            businessId: data.businessId || "",
            currentStamps: data.currentStamps,
            isRewardClaimed: data.isRewardClaimed,
            createdAt: data.createdAt.toDate(),
            lastStampDate: data.lastStampDate?.toDate(),
            cardCode: data.cardCode,
            customerName: data.customerName,
          };
          return customerCard;
        })
      );
      return customerCards;
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener todas las tarjetas del cliente por tarjeta de fidelidad");
    }
  }

  static async getRedemptionCount(customerId: string, loyaltyCardId: string): Promise<number> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("customerId", "==", customerId), where("loyaltyCardId", "==", loyaltyCardId), where("isRewardClaimed", "==", true));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error: any) {
      return 0;
    }
  }

  static async deleteCustomerCard(customerCardId: string): Promise<void> {
    try {
      // First, check if the user has permission to delete this card
      if (!auth.currentUser) {
        throw new Error("Debes estar autenticado para eliminar una tarjeta");
      }

      // Get the customer card to verify ownership
      const customerCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId));
      if (!customerCardDoc.exists()) {
        throw new Error("Tarjeta no encontrada");
      }

      const customerCardData = customerCardDoc.data();

      if (customerCardData.customerId !== auth.currentUser.uid) {
        throw new Error("No tienes permisos para eliminar esta tarjeta");
      }

      // Query and delete related documents - include customerId to satisfy strict list rules
      const userId = auth.currentUser.uid;
      
      const stampActivitiesQuery = query(
        collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), 
        where("customerCardId", "==", customerCardId),
        where("customerId", "==", userId)
      );
      const stampActivitiesSnapshot = await getDocs(stampActivitiesQuery);

      const stampsQuery = query(
        collection(db, FIREBASE_COLLECTIONS.STAMPS), 
        where("customerCardId", "==", customerCardId),
        where("customerId", "==", userId)
      );
      const stampsSnapshot = await getDocs(stampsQuery);

      const rewardsQuery = query(
        collection(db, FIREBASE_COLLECTIONS.REWARDS), 
        where("customerCardId", "==", customerCardId),
        where("customerId", "==", userId)
      );
      const rewardsSnapshot = await getDocs(rewardsQuery);

      // Execute deletions in sequence
      for (const stampActivityDoc of stampActivitiesSnapshot.docs) {
        await deleteDoc(stampActivityDoc.ref);
      }

      for (const stampDoc of stampsSnapshot.docs) {
        await deleteDoc(stampDoc.ref);
      }

      for (const rewardDoc of rewardsSnapshot.docs) {
        await deleteDoc(rewardDoc.ref);
      }

      // Finally, delete the customer card itself
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId));

      // Also clean up the taken code reservation if it exists
      if (customerCardData.businessId && customerCardData.cardCode) {
        try {
          const takenCodeRef = doc(db, `businesses/${customerCardData.businessId}/takenCodes/${customerCardData.cardCode}`);
          await deleteDoc(takenCodeRef);
        } catch (e) {
          console.warn("DEBUG: Failed to delete takenCode reservation (non-fatal)", e);
        }
      }
    } catch (error: any) {
      console.error("Error deleting customer card:", error);

      // Provide more specific error messages based on error codes
      if (error.code === "permission-denied") {
        throw new Error("No tienes permisos para eliminar esta tarjeta");
      } else if (error.code === "not-found") {
        throw new Error("Tarjeta no encontrada");
      } else if (error.code === "unauthenticated") {
        throw new Error("Debes estar autenticado para eliminar una tarjeta");
      } else {
        throw new Error(error.message || "Error al eliminar la tarjeta de cliente");
      }
    }
  }
}

export default CustomerCardService;
