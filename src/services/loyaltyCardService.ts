import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { Business, LoyaltyCard } from "../types";
import { BusinessService } from "./businessService";

export class LoyaltyCardService {
  static async createLoyaltyCard(cardData: Omit<LoyaltyCard, "id" | "createdAt">): Promise<LoyaltyCard> {
    if (!auth.currentUser) throw new Error("El usuario debe estar autenticado para crear una tarjeta de fidelidad");
    const cleanData = Object.fromEntries(Object.entries(cardData).filter(([_, v]) => v !== undefined && v !== "")) as Partial<LoyaltyCard>;
    if (!cleanData.businessId) throw new Error("businessId es requerido");
    const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), {
      ...cleanData,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...cardData, createdAt: new Date() };
  }

  private static async getBusiness(businessId: string): Promise<Business | null> {
    return await BusinessService.getBusiness(businessId);
  }

  static async getLoyaltyCardsByBusinessId(businessId: string): Promise<LoyaltyCard[]> {
    const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "==", businessId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
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
      } as LoyaltyCard;
    });
  }

  static async getAllActiveLoyaltyCards(): Promise<LoyaltyCard[]> {
    const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("isActive", "==", true), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const businessIds = Array.from(new Set(querySnapshot.docs.map((d) => d.data().businessId))).filter(Boolean);
    const businessesMap = new Map<string, Business>();
    await Promise.all(
      businessIds.map(async (bid) => {
        try {
          const biz = await this.getBusiness(bid);
          if (biz) businessesMap.set(bid, biz);
        } catch {}
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
      } as LoyaltyCard;
    });
  }

  static async updateLoyaltyCard(cardId: string, updates: Partial<LoyaltyCard>): Promise<void> {
    await updateDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId), { ...updates, updatedAt: serverTimestamp() });
  }

  static async deactivateLoyaltyCard(cardId: string): Promise<void> {
    await updateDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId), { isActive: false, deactivatedAt: serverTimestamp() });
  }

  static async deleteLoyaltyCard(cardId: string): Promise<void> {
    const customerCardsQuery = query(collection(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS), where("loyaltyCardId", "==", cardId));
    const customerCardsSnapshot = await getDocs(customerCardsQuery);
    const deletePromises: Promise<any>[] = [];

    for (const customerCardDoc of customerCardsSnapshot.docs) {
      const customerCardId = customerCardDoc.id;
      const stampActivitiesQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY), where("customerCardId", "==", customerCardId));
      const stampActivitiesSnapshot = await getDocs(stampActivitiesQuery);
      stampActivitiesSnapshot.docs.forEach((stampActivityDoc) => {
        deletePromises.push(deleteDoc(doc(db, FIREBASE_COLLECTIONS.STAMP_ACTIVITY, stampActivityDoc.id)));
      });
    }

    for (const customerCardDoc of customerCardsSnapshot.docs) {
      const customerCardId = customerCardDoc.id;
      const stampsQuery = query(collection(db, FIREBASE_COLLECTIONS.STAMPS), where("customerCardId", "==", customerCardId));
      const stampsSnapshot = await getDocs(stampsQuery);
      stampsSnapshot.docs.forEach((stampDoc) => {
        deletePromises.push(deleteDoc(doc(db, FIREBASE_COLLECTIONS.STAMPS, stampDoc.id)));
      });
    }

    customerCardsSnapshot.docs.forEach((customerCardDoc) => {
      deletePromises.push(deleteDoc(doc(db, FIREBASE_COLLECTIONS.CUSTOMER_CARDS, customerCardDoc.id)));
    });

    await Promise.all(deletePromises);
    await deleteDoc(doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId));
  }

  static async getLoyaltyCard(cardId: string) {
    const docRef = doc(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS, cardId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
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
    } as LoyaltyCard;
  }

  static async getLoyaltyCardsByBusiness(businessId: string): Promise<LoyaltyCard[]> {
    return this.getLoyaltyCardsByBusinessId(businessId);
  }

  static async getLoyaltyCardsByBusinessIds(businessIds: string[]): Promise<LoyaltyCard[]> {
    if (businessIds.length === 0) return [];
    const batchSize = 10;
    const batches: Promise<LoyaltyCard[]>[] = [];
    for (let i = 0; i < businessIds.length; i += batchSize) {
      const batchIds = businessIds.slice(i, i + batchSize);
      batches.push(this.getLoyaltyCardsBatch(batchIds));
    }
    const batchResults = await Promise.all(batches);
    return batchResults.flat();
  }

  private static async getLoyaltyCardsBatch(businessIds: string[]): Promise<LoyaltyCard[]> {
    const q = query(collection(db, FIREBASE_COLLECTIONS.LOYALTY_CARDS), where("businessId", "in", businessIds), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const businessesMap = new Map<string, Business>();
    const uniqueBusinessIds = Array.from(new Set(businessIds));
    await Promise.all(
      uniqueBusinessIds.map(async (businessId) => {
        const business = await BusinessService.getBusiness(businessId);
        if (business) businessesMap.set(businessId, business);
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
      } as LoyaltyCard;
    });
  }
}

export default LoyaltyCardService;
