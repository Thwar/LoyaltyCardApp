import { auth, db } from "../services/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export const testFirebaseConnection = async () => {
  try {
    console.log("Testing Firebase connection...");

    // Test auth
    console.log("Auth initialized:", !!auth);
    console.log("Current user:", auth.currentUser?.email || "Not logged in");

    // Test Firestore
    console.log("Firestore initialized:", !!db);

    // Try to read from a collection (this should work even if empty)
    try {
      const testCollection = collection(db, "test");
      const snapshot = await getDocs(testCollection);
      console.log("Firestore read test successful. Documents found:", snapshot.size);
    } catch (firestoreError) {
      console.error("Firestore read test failed:", firestoreError);
      throw firestoreError;
    }

    // If user is authenticated, try a write test
    if (auth.currentUser) {
      try {
        const testDoc = await addDoc(collection(db, "test"), {
          message: "Test document",
          timestamp: new Date(),
          userId: auth.currentUser.uid,
        });
        console.log("Firestore write test successful. Document ID:", testDoc.id);
      } catch (writeError) {
        console.error("Firestore write test failed:", writeError);
        throw writeError;
      }
    }

    return { success: true, message: "Firebase connection test passed" };
  } catch (error) {
    console.error("Firebase connection test failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      error,
    };
  }
};
