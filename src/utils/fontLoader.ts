import { useFonts } from "expo-font";
import { useEffect } from "react";
import { Platform } from "react-native";

export const useCustomFonts = () => {
  const [fontsLoaded, fontError] = useFonts({
    "BalooBhaijaan2-Regular": require("../../assets/fonts/BalooBhaijaan2-Regular.ttf"),
    "BalooBhaijaan2-Medium": require("../../assets/fonts/BalooBhaijaan2-Medium.ttf"),
    "BalooBhaijaan2-SemiBold": require("../../assets/fonts/BalooBhaijaan2-SemiBold.ttf"),
    "BalooBhaijaan2-Bold": require("../../assets/fonts/BalooBhaijaan2-Bold.ttf"),
    "BalooBhaijaan2-ExtraBold": require("../../assets/fonts/BalooBhaijaan2-ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontError) {
      console.error("❌ Font loading error:", fontError);
    }
    if (fontsLoaded) {
      console.log("✅ Custom fonts loaded successfully");
      console.log("Platform:", Platform.OS);
      console.log(
        "Available fonts:",
        Object.keys({
          "BalooBhaijaan2-Regular": true,
          "BalooBhaijaan2-Medium": true,
          "BalooBhaijaan2-SemiBold": true,
          "BalooBhaijaan2-Bold": true,
          "BalooBhaijaan2-ExtraBold": true,
        })
      );
    }
  }, [fontsLoaded, fontError]);

  return fontsLoaded;
};

export const getFontFamily = (weight: "regular" | "medium" | "semiBold" | "bold" | "extraBold" = "regular") => {
  const fontMap = {
    regular: "BalooBhaijaan2-Regular",
    medium: "BalooBhaijaan2-Medium",
    semiBold: "BalooBhaijaan2-SemiBold",
    bold: "BalooBhaijaan2-Bold",
    extraBold: "BalooBhaijaan2-ExtraBold",
  };

  const fontFamily = fontMap[weight];

  // On web, we might need to provide fallbacks
  if (Platform.OS === "web") {
    return `${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  }

  return fontFamily;
};
