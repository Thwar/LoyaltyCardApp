import { auth } from "../services/firebase";

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
