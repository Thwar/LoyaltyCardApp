import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { AuthService } from "../services/api";
import { User, AuthUser } from "../types";

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  loading: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, userType: "customer" | "business") => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

          // Get user data from Firestore
          const userData = await AuthService.getCurrentUser();
          if (userData) {
            setUser(userData);
            console.log("User data loaded from Firestore:", userData.email);
          } else {
            console.log("No user data found in Firestore, signing out");
            await AuthService.logout();
          }
        } else {
          console.log("No Firebase user, clearing state");
          setAuthUser(null);
          setUser(null);
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

    return () => unsubscribe();
  }, [loginHasFailed]);
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoggingIn(true);
    setLoginHasFailed(false);
    try {
      console.log("Attempting login for:", email);
      const userData = await AuthService.login(email, password);
      console.log("AuthService.login completed successfully");

      // Wait a moment to ensure Firebase auth state has stabilized
      await new Promise((resolve) => setTimeout(resolve, 100));
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
  const value: AuthContextType = {
    user,
    authUser,
    loading,
    isLoggingIn,
    login,
    register,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
