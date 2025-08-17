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
  // Web client ID from Android google-services.json (client_type: 3)
  webClientId: "853612097033-6nqf00qv5ei37ggspu0g1abqauposvb0.apps.googleusercontent.com",
  // Android client ID from google-services.json (client_type: 1) - Updated with correct SHA-1
  androidClientId: "853612097033-c14lg164nqpb27ikaoef88q397d80nho.apps.googleusercontent.com",
  // iOS client ID from GoogleService-Info.plist (CLIENT_ID)
  iosClientId: "853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba.apps.googleusercontent.com",
};

// Facebook App Configuration
const FACEBOOK_CONFIG = {
  appId: "1119577610065940",
  clientToken: "1c3d3fd5ca4c067a37377d3de3fb583f",
  appName: "LoyaltyCardApp",
};

export class SSOService {
  // Initialize Google Sign-In (for React Native)
  static async initializeGoogleSignIn() {
    if (Platform.OS !== "web") {
      try {
        const config: any = {
          webClientId: GOOGLE_CONFIG.webClientId,
          // Removed androidClientId (not a valid param for native library)
          offlineAccess: true,
          hostedDomain: "",
          forceCodeForRefreshToken: true,
        };

        // Platform-specific configuration
        if (Platform.OS === "ios") {
          config.iosClientId = GOOGLE_CONFIG.iosClientId;
        }

        console.log("Configuring Google Sign-In with config:", {
          webClientId: config.webClientId,
          iosClientId: config.iosClientId,
          platform: Platform.OS,
          expectedAndroidClientId: GOOGLE_CONFIG.androidClientId,
        });

        await GoogleSignin.configure(config);
        console.log("Google Sign-In configured successfully");

        // Verify configuration
        const hasPlayServices = await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: false,
        });
        console.log("Google Play Services available:", hasPlayServices);

        // Log current configuration for debugging
        try {
          const currentUser = await GoogleSignin.getCurrentUser();
          console.log("Current Google user:", currentUser ? "Signed in" : "Not signed in");
        } catch (getUserError) {
          console.log("No current Google user (this is normal)");
        }
      } catch (error) {
        console.error("Error configuring Google Sign-In:", error);
        // Don't throw here, let the actual sign-in attempt handle the error
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
        console.log("Starting Google Sign-In for mobile platform:", Platform.OS);

        // Initialize Google Sign-In
        await this.initializeGoogleSignIn();

        console.log("Checking Google Play Services...");
        // Check if device supports Google Play Services
        try {
          await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });
        } catch (playServicesError) {
          console.error("Google Play Services error:", playServicesError);
          throw new Error("Google Play Services no disponible. Por favor actualiza Google Play Services.");
        }

        console.log("Attempting Google Sign-In...");

        // Clear any cached auth state first
        try {
          await GoogleSignin.signOut();
          await GoogleSignin.revokeAccess();
          console.log("Cleared cached Google auth state");
        } catch (clearError) {
          console.log("No cached state to clear (normal)");
        }

        // Get user info from Google
        const userInfo = await GoogleSignin.signIn();
        // Log full shape once (safe keys only) to debug library return differences
        try {
          console.log("Google Sign-In raw keys:", Object.keys(userInfo || {}));
        } catch {}

        // Support both shapes: v14/v15 may nest under data
        const idToken = (userInfo as any)?.data?.idToken || (userInfo as any)?.idToken;
        const userEmail = (userInfo as any)?.data?.user?.email || (userInfo as any)?.user?.email;

        console.log("Google Sign-In successful, parsed:", {
          hasIdToken: !!idToken,
          userEmail,
        });

        if (!idToken) {
          console.error("No ID token received from Google (userInfo shape mismatch?)", userInfo);
          throw new Error("No se pudo obtener el token de Google");
        }

        // Create Firebase credential
        const googleCredential = GoogleAuthProvider.credential(idToken);

        console.log("Signing in with Firebase...");
        // Sign in with Firebase
        const result = await signInWithCredential(auth, googleCredential);
        console.log("Firebase sign-in successful");
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
      } else if (
        error.message?.includes("GoogleService-Info.plist") ||
        error.message?.includes("DEVELOPER_ERROR") ||
        error.code === "DEVELOPER_ERROR" ||
        error.message?.includes("SHA-1") ||
        error.message?.includes("certificate") ||
        error.message?.includes("oauth_client")
      ) {
        console.error("Developer error - likely configuration issue:", error);
        console.error("This usually means you need to rebuild your development client with the updated google-services.json file");
        throw new Error("Google Sign-In requiere una nueva compilación. Instala la nueva versión de desarrollo y vuelve a intentar.");
      } else {
        console.error("Unexpected Google Sign-In error:", error);
        throw new Error(error.message || "Error al iniciar sesión con Google");
      }
    }
  }

  // Fetch Facebook user profile
  static async fetchFacebookProfile(accessToken: string): Promise<{ email?: string; name?: string; picture?: string }> {
    try {
      console.log("Fetching Facebook profile with access token");
      const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Facebook API error response:", errorText);
        throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
      }

      const profile = await response.json();
      console.log("Facebook profile fetched:", {
        hasId: !!profile.id,
        hasEmail: !!profile.email,
        hasName: !!profile.name,
        hasPicture: !!profile.picture?.data?.url,
        emailValue: profile.email || "not provided",
      });

      // Facebook sometimes doesn't return email even when requested
      if (!profile.email) {
        console.warn("Facebook did not provide email address - this is common due to privacy settings");
      }

      return {
        email: profile.email || undefined,
        name: profile.name || undefined,
        picture: profile.picture?.data?.url || undefined,
      };
    } catch (error) {
      console.error("Error fetching Facebook profile:", error);
      // Don't throw here - return empty object so authentication can continue
      console.warn("Continuing Facebook authentication without profile data");
      return {};
    }
  }

  // Facebook Sign-In for Web
  static async signInWithFacebookWeb(): Promise<UserCredential & { facebookProfile?: any }> {
    try {
      console.log("Starting Facebook Web Sign-In with Firebase popup");

      // Configure Facebook provider with additional scopes
      facebookProvider.addScope("email");
      facebookProvider.addScope("public_profile");

      // Set custom parameters for better user experience
      facebookProvider.setCustomParameters({
        display: "popup",
      });

      // Use Firebase's built-in popup method
      const result = await signInWithPopup(auth, facebookProvider);
      console.log("Firebase Facebook sign-in successful");

      // Extract access token from the credential
      const credential = FacebookAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      let facebookProfile = null;
      if (accessToken) {
        try {
          // Fetch additional profile data from Facebook Graph API
          facebookProfile = await this.fetchFacebookProfile(accessToken);
        } catch (profileError) {
          console.warn("Could not fetch Facebook profile data:", profileError);
          // Continue without additional profile data
        }
      }

      // Attach the profile data for later use
      (result as any).facebookProfile = facebookProfile;

      return result as UserCredential & { facebookProfile?: any };
    } catch (error: any) {
      console.error("Facebook Sign-In Web error:", error);

      // Handle specific Firebase errors
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Inicio de sesión con Facebook cancelado");
      } else if (error.code === "auth/popup-blocked") {
        throw new Error("El navegador bloqueó la ventana emergente. Por favor permite ventanas emergentes para este sitio e intenta de nuevo.");
      } else if (error.code === "auth/cancelled-popup-request") {
        throw new Error("Inicio de sesión con Facebook cancelado");
      } else if (error.code === "auth/account-exists-with-different-credential") {
        throw new Error("Ya existe una cuenta con esta dirección de correo electrónico pero con un método de inicio de sesión diferente.");
      }

      throw new Error(error.message || "Error al iniciar sesión con Facebook");
    }
  }

  // Facebook Sign-In for React Native
  static async signInWithFacebookNative(): Promise<UserCredential & { facebookProfile?: any }> {
    try {
      console.log("Starting Facebook Native Sign-In");

      // Create platform-specific redirect URI for native
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: `fb${FACEBOOK_CONFIG.appId}`,
        path: "authorize",
      });

      console.log("Facebook Native Redirect URI:", redirectUri);

      // For React Native, we'll use expo-auth-session with Facebook
      const request = new AuthSession.AuthRequest({
        clientId: FACEBOOK_CONFIG.appId,
        scopes: ["public_profile", "email"],
        responseType: AuthSession.ResponseType.Token,
        redirectUri,
        // Add additional parameters for better compatibility and email access
        extraParams: {
          display: "popup",
          auth_type: "rerequest", // Force re-request of permissions
        },
      });

      const discovery = {
        authorizationEndpoint: "https://www.facebook.com/v19.0/dialog/oauth",
      };

      console.log("Prompting Facebook native login...");
      const result = await request.promptAsync(discovery);

      console.log("Facebook native auth result:", result.type);

      if (result.type === "success" && result.params.access_token) {
        console.log("Facebook native login successful, fetching user profile");

        // Fetch user profile from Facebook with explicit field request
        let facebookProfile = null;
        try {
          facebookProfile = await this.fetchFacebookProfile(result.params.access_token);
        } catch (profileError) {
          console.warn("Could not fetch Facebook profile data:", profileError);
          // Continue with basic data from Firebase
        }

        // Create Firebase credential
        const facebookCredential = FacebookAuthProvider.credential(result.params.access_token);

        // Sign in with Firebase
        const firebaseResult = await signInWithCredential(auth, facebookCredential);
        console.log("Firebase sign-in successful");

        // Enhanced profile data collection with fallbacks
        const firebaseUser = firebaseResult.user;
        const enhancedProfile = {
          email: facebookProfile?.email || firebaseUser.email || "",
          name: facebookProfile?.name || firebaseUser.displayName || "",
          picture: facebookProfile?.picture || firebaseUser.photoURL || "",
        };

        console.log("Enhanced Facebook profile data:", {
          hasEmail: !!enhancedProfile.email,
          hasName: !!enhancedProfile.name,
          hasPicture: !!enhancedProfile.picture,
          emailSource: facebookProfile?.email ? "facebook" : firebaseUser.email ? "firebase" : "none",
        });

        // Attach the enhanced profile data for later use
        (firebaseResult as any).facebookProfile = enhancedProfile;

        return firebaseResult as UserCredential & { facebookProfile?: any };
      } else if (result.type === "cancel") {
        throw new Error("Inicio de sesión con Facebook cancelado");
      } else {
        console.error("Facebook native login failed:", result);
        throw new Error("Error en el inicio de sesión con Facebook");
      }
    } catch (error: any) {
      console.error("Facebook Sign-In Native error:", error);
      throw new Error(error.message || "Error al iniciar sesión con Facebook");
    }
  }

  // Unified Facebook Sign-In
  static async signInWithFacebook(): Promise<UserCredential & { facebookProfile?: any }> {
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
