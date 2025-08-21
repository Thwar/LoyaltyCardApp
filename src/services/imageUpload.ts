import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, auth } from "./firebase";
import { Platform } from "react-native";

export class ImageUploadService {
  /**
   * Upload an image to Firebase Storage
   * @param imageUri Local URI of the image
   * @param folder Storage folder path (e.g., 'business-logos')
   * @param fileName Optional custom filename
   * @returns Promise<string> Download URL of uploaded image
   */ static async uploadImage(imageUri: string, folder: string, fileName?: string): Promise<string> {
    let storageRef: any; // Declare early for error logging

    try {
      // Check if user is authenticated and wait for auth state to be ready
      if (!auth.currentUser) {
        // Wait a bit for auth state to sync
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!auth.currentUser) {
          throw new Error("User must be authenticated to upload images");
        }
      }

      // Force token refresh to ensure we have a valid token
      await auth.currentUser.getIdToken(true);

      console.log("Current user:", auth.currentUser.uid);
      console.log("Uploading to folder:", folder, "filename:", fileName);

      // Generate filename if not provided
      if (!fileName) {
        const timestamp = Date.now();
        const extension = imageUri.split(".").pop() || "jpg";
        fileName = `${timestamp}.${extension}`;
      }

      // Create storage reference honoring secured folder structure
      let path = `${folder}/${fileName}`;
      // Map legacy flat folders to secured nested paths
      if (folder === "business-logos") {
        // Expect fileName like `${businessId}_logo.jpg` or pass businessId in caller to construct path
        // Prefer a businessId directory, infer from fileName prefix when present
        const inferredBusinessId = fileName.split("_")[0];
        path = `business-logos/${inferredBusinessId}/${fileName}`;

        console.log("Business logo upload - inferred business ID:", inferredBusinessId);
        console.log("Full storage path:", path);
      } else if (folder === "user-profiles") {
        const uid = auth.currentUser.uid;
        path = `user-profiles/${uid}/${fileName}`;
      } else if (folder === "loyalty-card-backgrounds") {
        // Expect fileName `${loyaltyCardId}_background.jpg`
        const inferredCardId = fileName.split("_")[0];
        path = `loyalty-card-backgrounds/${inferredCardId}/${fileName}`;
      }

      storageRef = ref(storage, path);

      // Convert image to blob based on platform
      let blob: Blob;

      if (Platform.OS === "web") {
        // For web platform - handle different image sources
        if (imageUri.startsWith("data:")) {
          // Data URL
          const response = await fetch(imageUri);
          blob = await response.blob();
        } else if (imageUri.startsWith("blob:")) {
          // Blob URL
          const response = await fetch(imageUri);
          blob = await response.blob();
        } else {
          // Regular URL
          const response = await fetch(imageUri, {
            mode: "cors",
          });
          blob = await response.blob();
        }
      } else {
        // For mobile platforms (iOS/Android)
        const response = await fetch(imageUri);
        blob = await response.blob();
      }

      // Ensure the blob is a valid image
      if (!blob.type.startsWith("image/")) {
        throw new Error("Selected file is not a valid image");
      }

      // Upload the blob
      console.log("Uploading image to:", path);
      const snapshot = await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log("Image uploaded successfully:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);

      // Enhanced error logging for debugging storage permission issues
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        // Check for specific Firebase Storage errors
        if (error.message.includes("storage/unauthorized")) {
          console.error("Firebase Storage unauthorized error. Check:");
          console.error("1. User is authenticated:", !!auth.currentUser);
          console.error("2. User ID:", auth.currentUser?.uid);
          console.error("3. Storage path:", storageRef.fullPath);
          console.error("4. Business document exists in Firestore");
          console.error("5. Storage rules allow this operation");
        }

        throw new Error(`Failed to upload image: ${error.message}`);
      }
      throw new Error("Failed to upload image");
    }
  }

  /**
   * Delete an image from Firebase Storage
   * @param imageUrl Full download URL of the image
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract the storage path from the download URL
      const pathMatch = imageUrl.match(/\/o\/(.+?)\?/);
      if (!pathMatch) {
        throw new Error("Invalid image URL format");
      }

      const storagePath = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, storagePath);

      await deleteObject(storageRef);
      console.log("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      // Don't throw error here as the image might already be deleted
      // or the URL might be invalid
    }
  }

  /**
   * Upload business logo
   * @param imageUri Local URI of the logo
   * @param businessId Business ID for unique naming
   * @returns Promise<string> Download URL of uploaded logo
   */
  static async uploadBusinessLogo(imageUri: string, businessId: string): Promise<string> {
    const fileName = `${businessId}_logo.jpg`;
    return this.uploadImage(imageUri, "business-logos", fileName);
  }

  /**
   * Delete business logo
   * @param logoUrl Full download URL of the logo
   */
  static async deleteBusinessLogo(logoUrl: string): Promise<void> {
    return this.deleteImage(logoUrl);
  }

  /**
   * Upload user profile image
   * @param imageUri Local URI of the profile image
   * @param userId User ID for unique naming
   * @returns Promise<string> Download URL of uploaded profile image
   */
  static async uploadUserProfileImage(imageUri: string, userId: string): Promise<string> {
    const fileName = `${userId}_profile.jpg`;
    return this.uploadImage(imageUri, "user-profiles", fileName);
  }

  /**
   * Delete user profile image
   * @param profileImageUrl Full download URL of the profile image
   */
  static async deleteUserProfileImage(profileImageUrl: string): Promise<void> {
    return this.deleteImage(profileImageUrl);
  }

  /**
   * Upload loyalty card background image
   * @param imageUri Local URI of the background image
   * @param loyaltyCardId Loyalty card ID for unique naming
   * @returns Promise<string> Download URL of uploaded background image
   */
  static async uploadLoyaltyCardBackground(imageUri: string, loyaltyCardId: string): Promise<string> {
    // Include timestamp in filename to ensure unique URLs and force cache busting
    const timestamp = Date.now();
    const fileName = `${loyaltyCardId}_background_${timestamp}.jpg`;
    return this.uploadImage(imageUri, "loyalty-card-backgrounds", fileName);
  }

  /**
   * Delete loyalty card background image
   * @param backgroundImageUrl Full download URL of the background image
   */
  static async deleteLoyaltyCardBackground(backgroundImageUrl: string): Promise<void> {
    return this.deleteImage(backgroundImageUrl);
  }
}
