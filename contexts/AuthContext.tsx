"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  digitalIdentifier: string;
  firstName: string;
  lastName: string;
  email: string;
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
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      setUser(JSON.parse(savedUser));
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

    // Store auth data
    setUser(data.user);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("auth-token", data.accessToken);
    localStorage.setItem("auth-refresh-token", data.refreshToken);
    localStorage.setItem("auth-user", JSON.stringify(data.user));
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

    // Update tokens
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("auth-token", data.accessToken);
    localStorage.setItem("auth-refresh-token", data.refreshToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-refresh-token");
    localStorage.removeItem("auth-user");
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

    const { data } = await response.json();

    // Automatically log in after registration
    setUser(data.user);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("auth-token", data.accessToken);
    localStorage.setItem("auth-refresh-token", data.refreshToken);
    localStorage.setItem("auth-user", JSON.stringify(data.user));
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
