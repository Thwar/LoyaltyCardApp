import { Platform } from "react-native";
import { signInWithCredential, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthCredential, UserCredential } from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "./firebase";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

// Configure WebBrowser for auth sessions
WebBrowser.maybeCompleteAuthSession();

// Google Sign-In Configuration
const GOOGLE_CONFIG = {
  // Using iOS client ID as web client ID temporarily for testing
  webClientId: "853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba.apps.googleusercontent.com", // Same as iOS for now
  // Android client ID (if different)
  androidClientId: "521869790852-d44rnvmkcvni1e7ijs2q371sgl36k05q.apps.googleusercontent.com", // Replace with actual client ID
  // iOS client ID (updated with real Firebase config)
  iosClientId: "853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba.apps.googleusercontent.com", // Real iOS client ID from Firebase
};

// Facebook App Configuration
const FACEBOOK_CONFIG = {
  appId: "YOUR_FACEBOOK_APP_ID", // Replace with your Facebook App ID
  appName: "CaseroApp",
};

export class SSOService {
  // Initialize Google Sign-In (for React Native)
  static async initializeGoogleSignIn() {
    if (Platform.OS !== "web") {
      try {
        await GoogleSignin.configure({
          webClientId: GOOGLE_CONFIG.webClientId,
          offlineAccess: true,
          hostedDomain: "",
          forceCodeForRefreshToken: true,
          iosClientId: GOOGLE_CONFIG.iosClientId, // Add iOS client ID
        });
        console.log("Google Sign-In configured successfully");
      } catch (error) {
        console.error("Error configuring Google Sign-In:", error);
        throw error;
      }
    }
  }

  // Google Sign-In
  static async signInWithGoogle(): Promise<UserCredential> {
    try {
      if (Platform.OS === "web") {
        // Web implementation using popup
        const result = await signInWithPopup(auth, googleProvider);
        return result;
      } else {
        // Check if Google Sign-In is properly configured
        try {
          await this.initializeGoogleSignIn();
        } catch (configError) {
          console.error("Google Sign-In not properly configured:", configError);
          throw new Error("Google Sign-In no está disponible en este momento. Por favor usa email/contraseña para iniciar sesión.");
        }

        // Check if device supports Google Play Services
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });

        // Get user info from Google
        const userInfo = await GoogleSignin.signIn();

        if (!userInfo.data?.idToken) {
          throw new Error("No ID token received from Google");
        }

        // Create Firebase credential
        const googleCredential = GoogleAuthProvider.credential(userInfo.data.idToken);

        // Sign in with Firebase
        const result = await signInWithCredential(auth, googleCredential);
        return result;
      }
    } catch (error: any) {
      console.error("Google Sign-In error:", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error("Inicio de sesión con Google cancelado");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error("Inicio de sesión con Google en progreso");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Google Play Services no disponible");
      } else if (error.message?.includes("GoogleService-Info.plist") || error.message?.includes("DEVELOPER_ERROR")) {
        throw new Error("Google Sign-In no está disponible en este momento. Por favor usa email/contraseña para iniciar sesión.");
      } else {
        throw new Error(error.message || "Error al iniciar sesión con Google");
      }
    }
  }

  // Facebook Sign-In for Web
  static async signInWithFacebookWeb(): Promise<UserCredential> {
    try {
      // Create auth request
      const request = new AuthSession.AuthRequest({
        clientId: FACEBOOK_CONFIG.appId,
        scopes: ["public_profile", "email"],
        responseType: AuthSession.ResponseType.Token,
        redirectUri: AuthSession.makeRedirectUri({}),
      });

      const discovery = {
        authorizationEndpoint: "https://www.facebook.com/v18.0/dialog/oauth",
      };

      const result = await request.promptAsync(discovery);

      if (result.type === "success" && result.params.access_token) {
        // Create Firebase credential
        const facebookCredential = FacebookAuthProvider.credential(result.params.access_token);

        // Sign in with Firebase
        const firebaseResult = await signInWithCredential(auth, facebookCredential);
        return firebaseResult;
      } else {
        throw new Error("Inicio de sesión con Facebook cancelado");
      }
    } catch (error: any) {
      console.error("Facebook Sign-In error:", error);
      throw new Error(error.message || "Error al iniciar sesión con Facebook");
    }
  }

  // Facebook Sign-In for React Native
  static async signInWithFacebookNative(): Promise<UserCredential> {
    try {
      // For React Native, we'll use expo-auth-session with Facebook
      const request = new AuthSession.AuthRequest({
        clientId: FACEBOOK_CONFIG.appId,
        scopes: ["public_profile", "email"],
        responseType: AuthSession.ResponseType.Token,
        redirectUri: AuthSession.makeRedirectUri({}),
      });

      const discovery = {
        authorizationEndpoint: "https://www.facebook.com/v18.0/dialog/oauth",
      };

      const result = await request.promptAsync(discovery);

      if (result.type === "success" && result.params.access_token) {
        // Create Firebase credential
        const facebookCredential = FacebookAuthProvider.credential(result.params.access_token);

        // Sign in with Firebase
        const firebaseResult = await signInWithCredential(auth, facebookCredential);
        return firebaseResult;
      } else {
        throw new Error("Inicio de sesión con Facebook cancelado");
      }
    } catch (error: any) {
      console.error("Facebook Sign-In error:", error);
      throw new Error(error.message || "Error al iniciar sesión con Facebook");
    }
  }

  // Unified Facebook Sign-In
  static async signInWithFacebook(): Promise<UserCredential> {
    if (Platform.OS === "web") {
      return await this.signInWithFacebookWeb();
    } else {
      return await this.signInWithFacebookNative();
    }
  }

  // Sign out from Google (if needed for cleanup)
  static async signOutGoogle(): Promise<void> {
    try {
      if (Platform.OS !== "web") {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.error("Error signing out from Google:", error);
    }
  }

  // Check if user is signed in with Google
  static async isGoogleSignedIn(): Promise<boolean> {
    try {
      if (Platform.OS !== "web") {
        const isSignedIn = await GoogleSignin.getCurrentUser();
        return isSignedIn !== null;
      }
      return false;
    } catch (error) {
      console.error("Error checking Google sign-in status:", error);
      return false;
    }
  }
}
