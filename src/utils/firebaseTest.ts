import { auth, storage } from "../services/firebase";
import { ref, uploadBytes, deleteObject } from "firebase/storage";

export const testFirebaseConnection = () => {
  console.log("Firebase Auth instance:", auth);
  console.log("Firebase App instance:", auth.app);
  console.log("Firebase Config:", auth.app.options);

  // Test if auth is properly initialized
  if (!auth) {
    console.error("Firebase Auth is not initialized");
    return false;
  }

  if (!auth.app) {
    console.error("Firebase App is not initialized");
    return false;
  }

  console.log("Firebase connection test passed");
  return true;
};

export const testStoragePermissions = async () => {
  console.log("Testing Firebase Storage permissions...");

  if (!auth.currentUser) {
    console.error("User must be authenticated to test storage permissions");
    return false;
  }

  try {
    // Create a small test blob
    const testData = new Blob(["test"], { type: "text/plain" });
    const testRef = ref(storage, `business-logos/test_${Date.now()}.txt`);

    console.log("Attempting to upload test file to:", testRef.fullPath);

    // Try to upload
    await uploadBytes(testRef, testData);
    console.log("✅ Upload successful - storage permissions are working");

    // Clean up - delete the test file
    await deleteObject(testRef);
    console.log("✅ Test file cleaned up");

    return true;
  } catch (error) {
    console.error("❌ Storage permission test failed:", error);
    return false;
  }
};
