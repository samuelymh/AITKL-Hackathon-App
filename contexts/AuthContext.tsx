"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  digitalIdentifier: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "patient" | "doctor" | "pharmacist" | "admin";
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface RegisterData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    contact: {
      email: string;
      phone: string;
    };
  };
  password: string;
  role?: "patient" | "doctor" | "pharmacist" | "admin";
  medicalInfo?: {
    bloodType?: string;
    knownAllergies?: string[];
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  refreshAuthToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("auth-token");
    const savedRefreshToken = localStorage.getItem("auth-refresh-token");
    const savedUser = localStorage.getItem("auth-user");

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Ensure user has a valid role property and phone number
        const userWithRole = {
          ...parsedUser,
          role: parsedUser.role || "patient",
          phone: parsedUser.phone || "",
        };
        setToken(savedToken);
        setRefreshToken(savedRefreshToken);
        setUser(userWithRole);
      } catch (error) {
        // If user data is corrupted, clear it
        console.error("Error parsing saved user data:", error);
        localStorage.removeItem("auth-token");
        localStorage.removeItem("auth-refresh-token");
        localStorage.removeItem("auth-user");
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const { data } = await response.json();

    // Ensure user has a valid role property and phone number
    const userWithRole = {
      ...data.user,
      role: data.user.role || "patient",
      phone: data.user.phone || "",
    };

    // Store auth data
    setUser(userWithRole);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("auth-token", data.accessToken);
    localStorage.setItem("auth-refresh-token", data.refreshToken);
    localStorage.setItem("auth-user", JSON.stringify(userWithRole));
  };

  const refreshAuthToken = async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid, logout user
      logout();
      throw new Error("Session expired, please login again");
    }

    const { data } = await response.json();

    // Ensure user has a valid role property and phone number
    const userWithRole = {
      ...data.user,
      role: data.user.role || "patient",
      phone: data.user.phone || "",
    };

    // Update tokens and user data
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(userWithRole); // Update user data from refresh response
    localStorage.setItem("auth-token", data.accessToken);
    localStorage.setItem("auth-refresh-token", data.refreshToken);
    localStorage.setItem("auth-user", JSON.stringify(userWithRole));
  };

  const logout = () => {
    // Clear all state
    setUser(null);
    setToken(null);
    setRefreshToken(null);

    // Clear localStorage with error handling
    try {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("auth-refresh-token");
      localStorage.removeItem("auth-user");

      // Also clear any potential legacy keys if they exist
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Error clearing localStorage during logout:", error);
      // Even if localStorage fails, continue with logout
    }

    // Redirect to login page
    router.push("/login");
  };

  const register = async (userData: RegisterData) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }

    // Registration successful - do NOT auto-login
    // User will need to manually login after registration
    return await response.json();
  };

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      logout,
      register,
      refreshAuthToken,
    }),
    [user, token, refreshToken, isLoading, login, logout, register, refreshAuthToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
