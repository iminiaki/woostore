"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: { firstName?: string; lastName?: string; phone?: string }) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (!parsed.email) return null;
    const placeholder =
      parsed.firstName === "John" && parsed.lastName === "Doe" && parsed.phone === "+1234567890";
    return {
      id: parsed.id || crypto.randomUUID(),
      firstName: placeholder ? "" : parsed.firstName || "",
      lastName: placeholder ? "" : parsed.lastName || "",
      email: parsed.email.trim().toLowerCase(),
      phone: placeholder ? "" : parsed.phone || "",
    };
  } catch {
    return null;
  }
}

function writeUser(next: User) {
  localStorage.setItem("user", JSON.stringify(next));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = readUser(localStorage.getItem("user"));
    if (saved) {
      setUser(saved);
      writeUser(saved);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string) => {
    const normalized = email.trim().toLowerCase();
    const saved = readUser(localStorage.getItem("user"));
    const next: User =
      saved && saved.email === normalized
        ? saved
        : {
            id: crypto.randomUUID(),
            firstName: "",
            lastName: "",
            email: normalized,
            phone: "",
          };
    setUser(next);
    writeUser(next);
  };

  const signup = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const next: User = {
      id: crypto.randomUUID(),
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      email: userData.email.trim().toLowerCase(),
      phone: userData.phone.trim(),
    };
    setUser(next);
    writeUser(next);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const updateProfile = (patch: { firstName?: string; lastName?: string; phone?: string }) => {
    setUser((current) => {
      if (!current) return current;
      const next: User = {
        ...current,
        firstName: patch.firstName?.trim() ?? current.firstName,
        lastName: patch.lastName?.trim() ?? current.lastName,
        phone: patch.phone?.trim() ?? current.phone,
      };
      writeUser(next);
      return next;
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateProfile,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
