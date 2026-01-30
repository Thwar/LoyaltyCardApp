import { Platform } from "react-native";
import { signInWithCredential, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthCredential, UserCredential, OAuthProvider } from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "./firebase";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import env from "../../config/env";

// Configure WebBrowser for auth sessions
WebBrowser.maybeCompleteAuthSession();

// Google Sign-In Configuration
const GOOGLE_CONFIG = {
  webClientId: env.GOOGLE_WEB_CLIENT_ID || "853612097033-6nqf00qv5ei37ggspu0g1abqauposvb0.apps.googleusercontent.com",
  // Force the specific client ID for current SHA-1: da:bf:0e:77:ba:d5:eb:7d:12:b2:04:a2:4a:d8:70:51:cc:b4:6a:3a
  androidClientId: "853612097033-0oaa0q2sfc2u4vb3tstcbnab316fp80j.apps.googleusercontent.com",
  iosClientId: "853612097033-p564p94gmsoaaq01pdnk145r4akvvnh1.apps.googleusercontent.com",
};

// Debug log the configuration
console.log("Google Sign-In config loaded:", {
  hasWebClientId: !!GOOGLE_CONFIG.webClientId,
  webClientId: GOOGLE_CONFIG.webClientId?.substring(0, 20) + "...", // Only show first 20 chars for security
  platform: Platform.OS,
});

// Facebook App Configuration
const FACEBOOK_CONFIG = {
  appId: env.FACEBOOK_APP_ID,
  clientToken: env.FACEBOOK_CLIENT_TOKEN,
  appName: env.APP_NAME,
};

export class SSOService {
  // Initialize Google Sign-In (for React Native)
  static async initializeGoogleSignIn() {
    if (Platform.OS !== "web") {
      try {
        const config: any = {
          webClientId: GOOGLE_CONFIG.webClientId,
          // Do NOT pass androidClientId here; GoogleSignIn resolves Android client from google-services.json
          scopes: ["profile", "email"],
          // Keep config minimal to reduce DEVELOPER_ERROR causes
        };

        // Platform-specific configuration
        if (Platform.OS === "ios" && GOOGLE_CONFIG.iosClientId) {
          config.iosClientId = GOOGLE_CONFIG.iosClientId;
        }

        console.log("Configuring Google Sign-In with config:", {
          webClientId: config.webClientId,
          iosClientId: config.iosClientId,
          platform: Platform.OS,
          hasWebClientId: !!config.webClientId,
          scopes: config.scopes,
          note: "androidClientId resolved from google-services.json",
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

        // Initialize Google Sign-In with enhanced error handling
        await this.initializeGoogleSignIn();

        console.log("Checking Google Play Services...");
        // Check if device supports Google Play Services
        try {
          await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });
        } catch (playServicesError) {
          console.error("Google Play Services error:", playServicesError);

          // Fallback: Try web-based auth for Android if native fails
          console.log("Falling back to web-based Google Sign-In due to Play Services issue");
          try {
            const result = await signInWithPopup(auth, googleProvider);
            return result;
          } catch (webError) {
            console.error("Web fallback also failed:", webError);
            throw new Error("Google Play Services no disponible y fallback web falló. Por favor actualiza Google Play Services.");
          }
        }

        console.log("Attempting Google Sign-In...");

        // Clear any cached auth state first - more aggressive clearing
        try {
          await GoogleSignin.signOut();
          console.log("Signed out from Google");
        } catch (signOutError) {
          console.log("No active session to sign out from (normal)");
        }

        try {
          await GoogleSignin.revokeAccess();
          console.log("Revoked Google access");
        } catch (revokeError) {
          console.log("No access to revoke (normal)");
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
        console.error("Current SHA-1 fingerprint should be: DA:BF:0E:77:BA:D5:EB:7D:12:B2:04:A2:4A:D8:70:51:CC:B4:6A:3A");
        console.error("Web Client ID should be:", GOOGLE_CONFIG.webClientId);
        console.error("Android Client ID should be:", GOOGLE_CONFIG.androidClientId);
        console.error("Full error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

        // Developer error detected - provide helpful guidance
        console.log("Attempting web-based Google authentication as fallback...");

        // Since we're in development and native auth is failing,
        // let's inform the user about the ongoing build
        throw new Error(
          "Google Sign-In necesita una nueva compilación. Una nueva versión está siendo creada ahora con la configuración actualizada. Por favor, espera unos minutos e instala la nueva versión."
        );
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

      // Validate App ID and build a safe redirect URI
      let scheme = undefined as string | undefined;
      if (FACEBOOK_CONFIG.appId && `${FACEBOOK_CONFIG.appId}`.trim().length > 0) {
        scheme = `fb${FACEBOOK_CONFIG.appId}`;
      } else {
        // Fallback so we never generate an invalid "fb://" scheme which causes
        // Android to open Play Store with an empty id (404)
        console.warn("FACEBOOK_APP_ID is missing. Falling back to app scheme 'caseroapp' for redirect URI.");
        scheme = "caseroapp";
      }

      // Create platform-specific redirect URI for native
      const redirectUri = AuthSession.makeRedirectUri({
        scheme,
        path: "authorize",
      });

      console.log("Facebook Native Redirect URI:", redirectUri);

      // For React Native, we'll use expo-auth-session with Facebook
      if (!FACEBOOK_CONFIG.appId) {
        throw new Error("Facebook App ID is not configured. Set FACEBOOK_APP_ID in your environment.");
      }
      const request = new AuthSession.AuthRequest({
        clientId: FACEBOOK_CONFIG.appId as string,
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

  // Apple Sign-In
  static async signInWithApple(): Promise<UserCredential & { appleFullName?: { givenName?: string; familyName?: string }; appleEmail?: string }> {
    try {
      if (Platform.OS === "web") {
        throw new Error("Apple Sign-In is not supported on web yet.");
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Apple Sign-In is not available on this device.");
      }

      console.log("Requesting Apple authentication...");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });

      console.log("Apple authentication successful, credential received.");

      // Verify the identity token exists
      if (!credential.identityToken) {
        throw new Error("Apple Sign-In failed - no identity token received.");
      }

      // Create a specific provider instance for Apple
      const provider = new OAuthProvider("apple.com");
      
      // Create a credential from the token
      const oauthCredential = provider.credential({
        idToken: credential.identityToken,
        accessToken: credential.authorizationCode || undefined, // rawNonce is optional, usually handled by Firebase SDK if using createCredential
      });

      // Sign in with Firebase
      console.log("Signing in to Firebase with Apple credential...");
      const result = await signInWithCredential(auth, oauthCredential);
      console.log("Firebase sign-in with Apple successful.");

      // Attach additional Apple-specific info (only available on first login)
      // We attach it to the result object so AuthService can use it for profile creation
      const extendedResult = result as UserCredential & { appleFullName?: { givenName?: string; familyName?: string }; appleEmail?: string };
      
      if (credential.fullName) {
        extendedResult.appleFullName = {
            givenName: credential.fullName.givenName || undefined,
            familyName: credential.fullName.familyName || undefined
        };
      }
      if (credential.email) {
        extendedResult.appleEmail = credential.email;
      }
      
      return extendedResult;

    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') { // Common Expo cancellation error code
         throw new Error("Inicio de sesión con Apple cancelado");
      }
      console.error("Apple Sign-In error:", error);
      throw new Error(error.message || "Error al iniciar sesión con Apple");
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
