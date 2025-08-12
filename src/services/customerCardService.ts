import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
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
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS),
        where("customerId", "==", customerId),
        where("loyaltyCardId", "==", loyaltyCardId),
        where("isRewardClaimed", "==", false),
        limit(1)
      );
      const existingCards = await getDocs(q);
      if (!existingCards.empty) throw new Error("Ya estás inscrito en este programa de fidelidad");

      const loyaltyCardDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, loyaltyCardId));
      if (!loyaltyCardDoc.exists()) throw new Error("Tarjeta de fidelidad no encontrada");
      const loyaltyCardData = loyaltyCardDoc.data();
      const businessId = loyaltyCardData.businessId;

      const cardCode = await generateUniqueCardCode(businessId, customerId);

      let customerName = "";
      try {
        const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, customerId));
        if (userDoc.exists()) customerName = userDoc.data().displayName || "";
      } catch {}

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
        await NotificationService.sendStampAddedNotification(notificationData);
        try {
          const customerUser = await UserService.getUser(customerId);
          if (customerUser?.pushToken) {
            await NotificationService.sendStampNotificationViaPush([customerUser.pushToken], notificationData);
          }
        } catch (pushErr) {
          console.warn("addStamp: push notification error", pushErr);
        }
        if (result.isCompleted) {
          await SoundService.playCompleteSound();
        } else {
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

  static async addStampByCardCodeAndBusiness(cardCode: string, businessId: string): Promise<void> {
    try {
      const customerCard = await this.getUnclaimedCustomerCardByCodeAndBusiness(cardCode, businessId);
      if (!customerCard) throw new Error("Tarjeta de cliente no encontrada con este código para este negocio");
      await this.addStamp(customerCard.id, customerCard.customerId, businessId, customerCard.loyaltyCardId);
    } catch (error: any) {
      throw new Error(error.message || "Error al agregar sello por código de tarjeta y negocio");
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
        await SoundService.playCompleteSound();
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
      const stampActivitiesQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), where("customerCardId", "==", customerCardId));
      const stampActivitiesSnapshot = await getDocs(stampActivitiesQuery);
      const stampsQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMPS), where("customerCardId", "==", customerCardId));
      const stampsSnapshot = await getDocs(stampsQuery);
      const rewardsQuery = query(collection(db, FIREBASE_COLLECTIONS.REWARDS), where("customerCardId", "==", customerCardId));
      const rewardsSnapshot = await getDocs(rewardsQuery);

      const deletePromises: Promise<any>[] = [];
      stampActivitiesSnapshot.docs.forEach((doc) => deletePromises.push(deleteDoc(doc.ref)));
      stampsSnapshot.docs.forEach((doc) => deletePromises.push(deleteDoc(doc.ref)));
      rewardsSnapshot.docs.forEach((doc) => deletePromises.push(deleteDoc(doc.ref)));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardId));
    } catch (error: any) {
      throw new Error(error.message || "Error al eliminar la tarjeta de cliente");
    }
  }
}

export default CustomerCardService;
