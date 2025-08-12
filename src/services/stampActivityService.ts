import { addDoc, collection, doc, getDocs, orderBy, query, where, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { StampActivity } from "../types";
import { Timestamp } from "./utils";

export class StampActivityService {
  static async createStampActivity(customerCardId: string, customerId: string, businessId: string, loyaltyCardId: string, stampCount: number, note?: string): Promise<StampActivity> {
    try {
      let customerName = "";
      let businessName = "";
      try {
        const [userDoc, businessDoc] = await Promise.all([getDoc(doc(db, FIREBASE_COLLECTIONS.USERS, customerId)), getDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId))]);
        if (userDoc.exists()) customerName = userDoc.data().displayName || "";
        if (businessDoc.exists()) businessName = businessDoc.data().name || "";
      } catch {}

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
        } as StampActivity;
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener las actividades de sello para la tarjeta del cliente");
    }
  }
}

export default StampActivityService;
