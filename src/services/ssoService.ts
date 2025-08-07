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
  // You'll need to add your Google Web Client ID here
  webClientId: "521869790852-72fbi96sk01f8lh0muldice9pqnu711n.apps.googleusercontent.com", // Replace with actual client ID
  // Android client ID (if different)
  androidClientId: "521869790852-d44rnvmkcvni1e7ijs2q371sgl36k05q.apps.googleusercontent.com", // Replace with actual client ID
  // iOS client ID (if different)
  iosClientId: "521869790852-lbmnm70iecpl8eklt102ddnnb5ja9j3e.apps.googleusercontent.com", // Replace with actual client ID
};

// Facebook App Configuration
const FACEBOOK_CONFIG = {
  appId: "YOUR_FACEBOOK_APP_ID", // Replace with your Facebook App ID
  appName: "LoyaltyCardApp",
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
        // React Native implementation
        await this.initializeGoogleSignIn();

        // Check if device supports Google Play Services
        await GoogleSignin.hasPlayServices();

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
