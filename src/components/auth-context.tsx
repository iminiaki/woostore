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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // For headless Woo, typical approach is JWT or WP Application Passwords.
    // Here we attempt to find or create a customer by email for demo purposes.
    try {
      // No direct Woo endpoint for auth; simulate login by ensuring a customer exists
      const res = await fetch('/api/woo/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      const u: User = {
        id: String(data.id || Date.now()),
        firstName: data.first_name || 'Customer',
        lastName: data.last_name || '',
        email: data.email || email,
        phone: data.billing?.phone || '',
      };
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/woo/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          billing: { phone: userData.phone, email: userData.email },
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Signup failed');
      const u: User = {
        id: String(data.id),
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.billing?.phone || '',
      };
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
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
