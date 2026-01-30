const admin = require("firebase-admin");

// INSTRUCTIONS FOR FIREBASE_SERVICE_ACCOUNT_KEY:
// 1. Go to Firebase Console -> Project Settings -> Service accounts
// 2. Click "Generate new private key". This downloads a JSON file.
// 3. Open the JSON file and copy its entire content.
// 4. Set the environment variable FIREBASE_SERVICE_ACCOUNT_KEY with this content.
//    - For local dev (if using dotenv): FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}'
//    - For Vercel/EAS: Add it as a secret.

if (!admin.apps.length) {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
            : null;

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not found. Admin SDK not initialized.");
        }
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method not allowed. Use DELETE." });
    }

    try {
        // 1. Verify Authentication (ID Token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid Authorization header" });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        if (!uid) {
            return res.status(401).json({ error: "Invalid token" });
        }

        console.log(`Starting account deletion for user: ${uid}`);

        // 2. Delete Firestore User Document
        // We try this first. If it fails, we might still want to proceed or fail.
        // Generally, if we can't delete data, we shouldn't delete the auth user yet to avoid "orphaned" data
        // that the user can no longer access to clean up.
        try {
            await admin.firestore().collection("users").doc(uid).delete();
            console.log(`Firestore document deleted for user: ${uid}`);
        } catch (firestoreError) {
            console.error("Error deleting Firestore document:", firestoreError);
            return res.status(500).json({
                error: "Failed to delete user data",
                details: firestoreError.message
            });
        }

        // 3. Delete Auth User
        try {
            await admin.auth().deleteUser(uid);
            console.log(`Auth user deleted: ${uid}`);
        } catch (authError) {
            console.error("Error deleting Auth user:", authError);
            // This is a critical failure state: Data is gone, but Auth User remains.
            // However, since data is gone, the account is effectively empty.
            return res.status(500).json({
                error: "Failed to delete authentication record",
                details: authError.message
            });
        }

        return res.status(200).json({ success: true, message: "Account deleted successfully" });

    } catch (error) {
        console.error("Account deletion failed:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: error.message
        });
    }
};
