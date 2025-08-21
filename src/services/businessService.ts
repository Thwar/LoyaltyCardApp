import { auth, db } from "./firebase";
import { FIREBASE_COLLECTIONS } from "../constants";
import { Business } from "../types";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, startAfter } from "firebase/firestore";
import { handleFirestoreError, safeTimestampToDate } from "./utils";

export class BusinessService {
  static mapBusinessDoc(docSnap: any): Business {
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
      createdAt: safeTimestampToDate(data.createdAt),
      isActive: data.isActive,
    };
  }

  static async createBusiness(businessData: Omit<Business, "id" | "createdAt">): Promise<Business> {
    try {
      if (!auth.currentUser) throw new Error("El usuario debe estar autenticado para crear un negocio");
      const cleanData = Object.fromEntries(Object.entries(businessData).filter(([_, v]) => v !== undefined && v !== "")) as Partial<Business>;
      // Enforce ownerId to match current user to satisfy security rules
      const ownerId = auth.currentUser.uid;
      const payload = { ...cleanData, ownerId, createdAt: serverTimestamp() } as any;
      const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), payload);
      return { id: docRef.id, ...(cleanData as any), ownerId, createdAt: new Date() } as Business;
    } catch (error: any) {
      handleFirestoreError(error, "crear negocio");
      throw error;
    }
  }

  static async getBusinessByOwnerId(ownerId: string): Promise<Business | null> {
    try {
      const q = query(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), where("ownerId", "==", ownerId), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      const d = querySnapshot.docs[0];
      const data = d.data();
      return {
        id: d.id,
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
        createdAt: safeTimestampToDate(data.createdAt),
        isActive: data.isActive,
      };
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener el negocio");
    }
  }

  static async updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
    try {
      const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([k, v]) => v !== undefined && v !== "" && k !== "id" && k !== "createdAt"));
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId), { ...cleanUpdates, updatedAt: serverTimestamp() });
    } catch (error: any) {
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
      return querySnapshot.docs.map((doc) => this.mapBusinessDoc(doc));
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener los negocios");
    }
  }

  static async getPaginatedBusinesses(page: number = 0, pageSize: number = 10): Promise<Business[]> {
    if (page <= 0) {
      const first = await this.getBusinessesPage(pageSize);
      return first.items;
    }
    let cursor: string | undefined = undefined;
    for (let p = 0; p <= page; p++) {
      const res = await this.getBusinessesPage(pageSize, cursor);
      if (p === page) return res.items;
      if (!res.hasMore) return [];
      cursor = res.nextCursor;
    }
    return [];
  }

  static async getBusiness(businessId: string): Promise<Business | null> {
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.BUSINESSES, businessId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
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
        createdAt: safeTimestampToDate(data.createdAt),
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
          createdAt: safeTimestampToDate(data.createdAt),
          isActive: data.isActive,
        } as Business;
      });
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener los negocios del propietario");
    }
  }

  static async getBusinessesPage(pageSize: number = 20, cursor?: string): Promise<{ items: Business[]; nextCursor?: string; hasMore: boolean }> {
    try {
      if (pageSize <= 0) pageSize = 1;
      if (pageSize > 50) pageSize = 50;
      let startAfterSnap: any = null;
      if (cursor) {
        try {
          const docRef = doc(db, FIREBASE_COLLECTIONS.BUSINESSES, cursor);
          const snap = await getDoc(docRef);
          if (snap.exists()) startAfterSnap = snap;
        } catch (e) {
          console.warn("getBusinessesPage: failed to resolve cursor", e);
        }
      }
      let qBase: any = query(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), where("isActive", "==", true), orderBy("name"), limit(pageSize + 1));
      if (startAfterSnap) {
        qBase = query(collection(db, FIREBASE_COLLECTIONS.BUSINESSES), where("isActive", "==", true), orderBy("name"), startAfter(startAfterSnap), limit(pageSize + 1));
      }
      const snapshot = await getDocs(qBase);
      const docs = snapshot.docs;
      const hasMore = docs.length > pageSize;
      const slice = hasMore ? docs.slice(0, pageSize) : docs;
      const items = slice.map(this.mapBusinessDoc);
      const lastDoc = slice[slice.length - 1];
      const nextCursor = hasMore && lastDoc ? lastDoc.id : undefined;
      return { items, nextCursor, hasMore };
    } catch (error: any) {
      throw new Error(error.message || "Error al paginar los negocios");
    }
  }
}

export default BusinessService;
