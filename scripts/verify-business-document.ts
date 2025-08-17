// This script was used for debugging business logo upload permission issues
// The issue has been resolved - kept for reference

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// RESOLVED: The Firebase Storage permission issue was caused by:
// 1. Business creation timing (fixed by reordering operations)
// 2. Incorrect Storage rules syntax (fixed by using firestore.exists() instead of exists())
// 3. Missing IAM permissions (fixed automatically by Firebase during deployment)

const firebaseConfig = {
  // Add your Firebase config here if you need to run this script
  // You can get this from your Firebase console
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function verifyBusinessDocument() {
  const businessId = "eJXoPP66bXlsEFzAqk68"; // The business ID from the error logs
  const expectedUserId = "JdG2hIpAf4eg9E2ZtYlW5KAC6Un1"; // The user ID from the error logs

  try {
    console.log("Checking business document...");
    console.log("Business ID:", businessId);
    console.log("Expected User ID:", expectedUserId);

    const businessRef = doc(db, "businesses", businessId);
    const businessDoc = await getDoc(businessRef);

    if (!businessDoc.exists()) {
      console.error("❌ Business document does NOT exist!");
      return;
    }

    console.log("✅ Business document exists");

    const businessData = businessDoc.data();
    console.log("Business data:", JSON.stringify(businessData, null, 2));

    if (businessData.ownerId === expectedUserId) {
      console.log("✅ Owner ID matches expected user ID");
    } else {
      console.error("❌ Owner ID mismatch!");
      console.error("Expected:", expectedUserId);
      console.error("Actual:", businessData.ownerId);
    }

    // Check the exact path that Firebase Storage rules would use
    console.log("\nTesting Firebase Storage rule path:");
    console.log("Path: /databases/(default)/documents/businesses/" + businessId);
  } catch (error) {
    console.error("Error checking business document:", error);
  }
}

// Uncomment to run:
// verifyBusinessDocument();
