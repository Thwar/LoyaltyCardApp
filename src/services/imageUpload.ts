import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import { Platform } from "react-native";

export class ImageUploadService {
  /**
   * Upload an image to Firebase Storage
   * @param imageUri Local URI of the image
   * @param folder Storage folder path (e.g., 'business-logos')
   * @param fileName Optional custom filename
   * @returns Promise<string> Download URL of uploaded image
   */
  static async uploadImage(
    imageUri: string,
    folder: string,
    fileName?: string
  ): Promise<string> {
    try {
      // Generate filename if not provided
      if (!fileName) {
        const timestamp = Date.now();
        const extension = imageUri.split('.').pop() || 'jpg';
        fileName = `${timestamp}.${extension}`;
      }

      // Create storage reference
      const storageRef = ref(storage, `${folder}/${fileName}`);

      // Convert image to blob based on platform
      let blob: Blob;
      
      if (Platform.OS === 'web') {
        // For web platform - handle different image sources
        if (imageUri.startsWith('data:')) {
          // Data URL
          const response = await fetch(imageUri);
          blob = await response.blob();
        } else if (imageUri.startsWith('blob:')) {
          // Blob URL
          const response = await fetch(imageUri);
          blob = await response.blob();
        } else {
          // Regular URL
          const response = await fetch(imageUri, {
            mode: 'cors',
          });
          blob = await response.blob();
        }
      } else {
        // For mobile platforms (iOS/Android)
        const response = await fetch(imageUri);
        blob = await response.blob();
      }

      // Ensure the blob is a valid image
      if (!blob.type.startsWith('image/')) {
        throw new Error('Selected file is not a valid image');
      }

      // Upload the blob
      console.log('Uploading image to:', `${folder}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('Image uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }
      throw new Error('Failed to upload image');
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
        throw new Error('Invalid image URL format');
      }

      const storagePath = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, storagePath);
      
      await deleteObject(storageRef);
      console.log('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
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
  static async uploadBusinessLogo(
    imageUri: string,
    businessId: string
  ): Promise<string> {
    const fileName = `${businessId}_logo.jpg`;
    return this.uploadImage(imageUri, 'business-logos', fileName);
  }

  /**
   * Delete business logo
   * @param logoUrl Full download URL of the logo
   */
  static async deleteBusinessLogo(logoUrl: string): Promise<void> {
    return this.deleteImage(logoUrl);
  }
}
