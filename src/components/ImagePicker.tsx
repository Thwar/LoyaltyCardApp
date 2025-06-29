import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePickerExpo from "expo-image-picker";
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

export const ImagePicker: React.FC<ImagePickerProps> = ({ label, value, onImageSelect, error, placeholder = "Seleccionar imagen", uploading: externalUploading = false }) => {
  const [uploading, setUploading] = useState(false);
  const { showAlert } = useAlert();
  const isUploading = uploading || externalUploading;

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

      let result;

      if (Platform.OS === "web") {
        // For web, use the expo-image-picker which handles file input
        result = await ImagePickerExpo.launchImageLibraryAsync({
          mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1], // Square aspect ratio for logo
          quality: 0.8,
          base64: false,
        });
      } else {
        // For mobile platforms
        result = await ImagePickerExpo.launchImageLibraryAsync({
          mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1], // Square aspect ratio for logo
          quality: 0.8,
          base64: false,
        });
      }
      if (!result.canceled && result.assets[0]) {
        let imageUri = result.assets[0].uri;

        // Convert to data URL for web compatibility
        if (Platform.OS === "web") {
          imageUri = await convertToDataUrl(imageUri);
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

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: "Permisos requeridos",
          message: "Necesitamos permisos para acceder a tu cámara.",
        });
        return;
      }

      setUploading(true);

      const result = await ImagePickerExpo.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logo
        quality: 0.8,
        base64: false,
      });
      if (!result.canceled && result.assets[0]) {
        let imageUri = result.assets[0].uri;

        // Convert to data URL for web compatibility
        if (Platform.OS === "web") {
          imageUri = await convertToDataUrl(imageUri);
        }

        onImageSelect(imageUri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      showAlert({
        title: "Error",
        message: "No se pudo tomar la foto",
      });
    } finally {
      setUploading(false);
    }
  };

  const showImageSourceOptions = () => {
    if (Platform.OS === "web") {
      // On web, only show gallery option
      pickImage();
    } else {
      // On mobile, show both options
      showAlert({
        title: "Seleccionar imagen",
        message: "¿Cómo quieres agregar tu logo?",
        buttons: [
          { text: "Galería", onPress: pickImage },
          { text: "Cámara", onPress: takePhoto },
          { text: "Cancelar", style: "cancel" },
        ],
      });
    }
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
                <Text style={styles.uploadingText}>Subiendo...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name={isUploading ? "cloud-upload" : "camera"} size={40} color={COLORS.textSecondary} />
            <Text style={styles.placeholderText}>{isUploading ? "Subiendo..." : placeholder}</Text>
            <Text style={styles.placeholderSubtext}>{isUploading ? "Por favor espera..." : `Toca para ${Platform.OS === "web" ? "seleccionar" : "seleccionar o tomar una foto"}`}</Text>
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
});
