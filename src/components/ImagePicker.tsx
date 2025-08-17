import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePickerExpo from "expo-image-picker";
import Resizer from "react-image-file-resizer";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { useAlert } from "./Alert";

interface ImagePickerProps {
  label: string;
  value?: string;
  onImageSelect: (uri: string) => void;
  error?: string;
  placeholder?: string;
  uploading?: boolean;
}

/**
 * ImagePicker component with built-in compression and optimization
 *
 * Features:
 * - Web: Advanced compression using react-image-file-resizer with WebP format
 * - Mobile: Uses expo-image-picker's built-in compression (60% quality)
 * - Resizes images to max 400x400px with maintained aspect ratio
 * - Progressive compression to ensure optimal file sizes
 * - Cross-platform support (web, iOS, Android)
 * - No native modules required - works with Expo Go and dev builds
 * - Fallback compression methods for maximum compatibility
 */

export const ImagePicker: React.FC<ImagePickerProps> = ({ label, value, onImageSelect, error, placeholder = "Seleccionar imagen", uploading: externalUploading = false }) => {
  const [uploading, setUploading] = useState(false);
  const { showAlert } = useAlert();
  const isUploading = uploading || externalUploading;

  // Configuration for image optimization
  const IMAGE_CONFIG = {
    maxWidth: 400, // Will be used for web canvas compression
    maxHeight: 400, // Will be used for web canvas compression
    quality: 0.6, // More aggressive compression for expo-image-picker
    maxFileSizeKB: 200, // Maximum file size in KB
  };

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: "Permisos requeridos",
          message: "Necesitamos permisos para acceder a tu galería de fotos.",
        });
        return false;
      }
    }
    return true;
  };

  const checkAndOptimizeFileSize = async (uri: string): Promise<string> => {
    try {
      if (Platform.OS === "web") {
        // For web, check data URL size
        const base64Data = uri.split(",")[1];
        if (base64Data) {
          const sizeInBytes = (base64Data.length * 3) / 4;
          const sizeInKB = sizeInBytes / 1024;

          if (sizeInKB > IMAGE_CONFIG.maxFileSizeKB) {
            // Further compress by reducing quality
            return await compressImageForWeb(uri, 0.5);
          }
        }
        return uri;
      } else {
        // For mobile, we'll rely on the initial compression from expo-image-picker
        // since we can't use FileSystem without additional setup
        return uri;
      }
    } catch (error) {
      console.error("Error checking file size:", error);
      return uri;
    }
  };

  const resizeAndCompressImage = async (uri: string): Promise<string> => {
    try {
      if (Platform.OS === "web") {
        // For web, use react-image-file-resizer which works great on web
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], "image.jpg", { type: blob.type });

        return new Promise((resolve) => {
          Resizer.imageFileResizer(
            file,
            IMAGE_CONFIG.maxWidth, // maxWidth
            IMAGE_CONFIG.maxHeight, // maxHeight
            "WEBP", // compressFormat (WEBP for better compression)
            IMAGE_CONFIG.quality * 100, // quality (0-100)
            0, // rotation
            (uri) => {
              resolve(uri as string);
            },
            "base64" // outputType
          );
        });
      } else {
        // For mobile platforms, we'll use our canvas-based compression as fallback
        return await compressImageForWeb(uri);
      }
    } catch (error) {
      console.error("Error resizing image:", error);
      // Fallback to canvas compression
      if (Platform.OS === "web") {
        return await compressImageForWeb(uri);
      }
      return uri; // Return original if compression failed
    }
  };

  const compressImageForWeb = async (uri: string, customQuality?: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const maxSize = IMAGE_CONFIG.maxWidth;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to WebP if supported, otherwise JPEG
        const format = canvas.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";

        const quality = customQuality || IMAGE_CONFIG.quality;
        const compressedDataUrl = canvas.toDataURL(format, quality);
        resolve(compressedDataUrl);
      };

      img.src = uri;
    });
  };

  const convertToDataUrl = async (uri: string): Promise<string> => {
    if (Platform.OS === "web") {
      try {
        // For web, convert the file to a data URL
        const response = await fetch(uri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error converting to data URL:", error);
        return uri; // Fallback to original URI
      }
    }
    return uri; // For mobile, return original URI
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      setUploading(true);

      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logo
        quality: IMAGE_CONFIG.quality,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        let imageUri = result.assets[0].uri;

        // Compress and resize the image
        if (Platform.OS === "web") {
          // Use the advanced resizer for web
          imageUri = await resizeAndCompressImage(imageUri);
          imageUri = await checkAndOptimizeFileSize(imageUri);
        } else {
          // For mobile, expo-image-picker handles the compression with quality setting
          // The allowsEditing and quality parameters provide basic optimization
          imageUri = await checkAndOptimizeFileSize(imageUri);
        }

        onImageSelect(imageUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert({
        title: "Error",
        message: "No se pudo seleccionar la imagen",
      });
    } finally {
      setUploading(false);
    }
  };

  const showImageSourceOptions = () => {
    // For both web and mobile, just use the gallery picker like in CustomerProfileScreen
    pickImage();
  };

  const removeImage = () => {
    if (Platform.OS === "web") {
      // For web, use native confirm dialog
      if (window.confirm("¿Estás seguro que quieres remover esta imagen?")) {
        onImageSelect("");
      }
    } else {
      // For mobile, use the custom alert
      showAlert({
        title: "Remover imagen",
        message: "¿Estás seguro que quieres remover esta imagen?",
        buttons: [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: () => {
              onImageSelect("");
            },
          },
        ],
      });
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={[styles.imageContainer, error ? styles.errorBorder : null]} onPress={showImageSourceOptions} disabled={isUploading}>
        {value && value.trim() !== "" ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: value }} style={styles.image} />
            {!isUploading && (
              <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
                <Ionicons name="close-circle" size={24} color={COLORS.error} />
              </TouchableOpacity>
            )}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <Ionicons name="cloud-upload" size={32} color={COLORS.white} />
                <Text style={styles.uploadingText}>Optimizando imagen...</Text>
                <Text style={styles.uploadingSubtext}>Comprimiendo y redimensionando</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name={isUploading ? "cloud-upload" : "camera"} size={40} color={COLORS.textSecondary} />
            <Text style={styles.placeholderText}>{isUploading ? "Procesando imagen..." : placeholder}</Text>
            <Text style={styles.placeholderSubtext}>{isUploading ? "Optimizando tamaño y calidad..." : "Toca para seleccionar una imagen"}</Text>
          </View>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  imageContainer: {
    height: 120,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  errorBorder: {
    borderColor: COLORS.error,
  },
  imageWrapper: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  placeholderText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  placeholderSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginTop: 4,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
    fontWeight: "600",
  },
  uploadingSubtext: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    marginTop: 4,
    opacity: 0.9,
  },
});
