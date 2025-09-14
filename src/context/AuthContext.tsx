import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { AuthService } from "../services/api";
import { User, AuthUser } from "../types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { UserService } from "../services/userService";

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  loading: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, userType: "customer" | "business") => Promise<User>;
  signInWithGoogle: (isRegistering?: boolean, userType?: "customer" | "business") => Promise<void>;
  signInWithFacebook: (isRegistering?: boolean, userType?: "customer" | "business") => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginHasFailed, setLoginHasFailed] = useState(false);
  const sessionUnsubRef = useRef<null | (() => void)>(null);

  // Timeout management
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Function to clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach((timeout: NodeJS.Timeout) => clearTimeout(timeout));
    timeoutRefs.current = [];
  }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email || "no user");

      // If login just failed, don't set user state
      if (loginHasFailed) {
        console.log("Ignoring auth state change because login failed");
        setLoginHasFailed(false); // Reset the flag
        if (firebaseUser) {
          // Force sign out if there's still a user after login failure
          await AuthService.logout();
        }
        return;
      }

      try {
        if (firebaseUser) {
          setAuthUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });

          // Get user data from Firestore with retry logic for new users
          let userData = null;
          let retryCount = 0;
          const maxRetries = 3;

          while (!userData && retryCount < maxRetries) {
            try {
              userData = await AuthService.getCurrentUser();
              if (userData) {
                break;
              }

              // If no user data found and this is a new user, wait a bit and retry
              if (retryCount < maxRetries - 1) {
                console.log(`No user data found, retrying in ${(retryCount + 1) * 500}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 500));
              }
              retryCount++;
            } catch (error) {
              console.warn(`Error getting user data (attempt ${retryCount + 1}/${maxRetries}):`, error);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 500));
              }
            }
          }

          if (userData) {
            setUser(userData);
            console.log("User data loaded from Firestore:", userData.email);

            // Persist initial sessionVersion locally if present
            try {
              const userDocRef = doc(db, "users", firebaseUser.uid);
              const deviceId = await UserService.getOrCreateDeviceId();
              // Subscribe to changes for forced-logout handling
              if (sessionUnsubRef.current) {
                sessionUnsubRef.current();
              }
              let firstSnapshot = true;
              sessionUnsubRef.current = onSnapshot(userDocRef, async (snap) => {
                const data = snap.data() as any;
                if (!data) return;
                const remoteVersion = (data.sessionVersion as number) || 0;
                const initiator = (data.lastInitiatorDeviceId as string) || "";
                const localVersion = await UserService.getLocalSessionVersion(firebaseUser.uid);

                if (firstSnapshot) {
                  // On initial subscribe after login, sync local to remote and don't force logout
                  await UserService.setLocalSessionVersion(firebaseUser.uid, remoteVersion);
                  firstSnapshot = false;
                  return;
                }

                // If the remote version increased and this device wasn't the initiator, force logout
                if (remoteVersion > localVersion && initiator && initiator !== deviceId) {
                  console.log("Detected forced logout from another device. Signing out...");
                  try {
                    await AuthService.logout();
                  } catch (e) {
                    console.warn("Error during forced logout:", e);
                  } finally {
                    setAuthUser(null);
                    setUser(null);
                  }
                } else if (remoteVersion >= 0 && remoteVersion !== localVersion) {
                  // Keep local version in sync to avoid repeated sign-outs
                  await UserService.setLocalSessionVersion(firebaseUser.uid, remoteVersion);
                }
              });
            } catch (e) {
              console.warn("Failed to set up session listener:", e);
            }
          } else {
            console.log("No user data found in Firestore after retries, signing out");
            await AuthService.logout();
          }
        } else {
          console.log("No Firebase user, clearing state");
          setAuthUser(null);
          setUser(null);
          if (sessionUnsubRef.current) {
            sessionUnsubRef.current();
            sessionUnsubRef.current = null;
          }
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        setAuthUser(null);
        setUser(null);
        // Sign out if there's an error getting user data
        try {
          await AuthService.logout();
        } catch (logoutError) {
          console.error("Error during cleanup logout:", logoutError);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearAllTimeouts();
      if (sessionUnsubRef.current) {
        sessionUnsubRef.current();
        sessionUnsubRef.current = null;
      }
    };
  }, [loginHasFailed, clearAllTimeouts]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return clearAllTimeouts;
  }, [clearAllTimeouts]);
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoggingIn(true);
    setLoginHasFailed(false);
    try {
      console.log("Attempting login for:", email);
      const userData = await AuthService.login(email, password);
      console.log("AuthService.login completed successfully");

      // Wait a moment to ensure Firebase auth state has stabilized
      const timeout = setTimeout(() => {
        // Timeout completion - this is just for timing, no action needed
      }, 100);
      timeoutRefs.current.push(timeout);
    } catch (error) {
      console.error("Login failed in AuthContext:", error);
      setLoginHasFailed(true);

      // Ensure we're signed out if login fails
      try {
        await AuthService.logout();
      } catch (logoutError) {
        console.error("Error during cleanup logout:", logoutError);
      }
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };
  const register = async (email: string, password: string, displayName: string, userType: "customer" | "business"): Promise<User> => {
    try {
      setLoading(true);
      const userData = await AuthService.register(email, password, displayName, userType);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await AuthService.logout();
      setUser(null);
      setAuthUser(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (auth.currentUser) {
        const userData = await AuthService.getCurrentUser();
        if (userData) {
          setUser(userData);
          console.log("User data refreshed:", userData.email);
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  const signInWithGoogle = async (isRegistering: boolean = false, userType: "customer" | "business" = "customer"): Promise<void> => {
    setIsLoggingIn(true);
    setLoginHasFailed(false);
    try {
      console.log("Attempting Google Sign-In");
      const userData = await AuthService.signInWithGoogle(isRegistering, userType);
      console.log("Google Sign-In completed successfully, user created/retrieved:", userData.email);

      // Set the user immediately to prevent the auth state change from signing them out
      setUser(userData);

      // Wait a moment to ensure Firebase auth state has stabilized
      const timeout = setTimeout(() => {
        // Timeout completion - this is just for timing, no action needed
      }, 100);
      timeoutRefs.current.push(timeout);
    } catch (error) {
      console.error("Google Sign-In failed in AuthContext:", error);
      setLoginHasFailed(true);

      // Ensure we're signed out if login fails
      try {
        await AuthService.logout();
      } catch (logoutError) {
        console.error("Error during cleanup logout:", logoutError);
      }
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signInWithFacebook = async (isRegistering: boolean = false, userType: "customer" | "business" = "customer"): Promise<void> => {
    setIsLoggingIn(true);
    setLoginHasFailed(false);
    try {
      console.log("Attempting Facebook Sign-In");
      const userData = await AuthService.signInWithFacebook(isRegistering, userType);
      console.log("Facebook Sign-In completed successfully, user created/retrieved:", userData.email);

      // Set the user immediately to prevent the auth state change from signing them out
      setUser(userData);

      // Wait a moment to ensure Firebase auth state has stabilized
      const timeout = setTimeout(() => {
        // Timeout completion - this is just for timing, no action needed
      }, 100);
      timeoutRefs.current.push(timeout);
    } catch (error) {
      console.error("Facebook Sign-In failed in AuthContext:", error);
      setLoginHasFailed(true);

      // Ensure we're signed out if login fails
      try {
        await AuthService.logout();
      } catch (logoutError) {
        console.error("Error during cleanup logout:", logoutError);
      }
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const value: AuthContextType = {
    user,
    authUser,
    loading,
    isLoggingIn,
    login,
    register,
    signInWithGoogle,
    signInWithFacebook,
    logout,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
