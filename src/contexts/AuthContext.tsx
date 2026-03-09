import React, { createContext, useContext, useState, useCallback } from "react";
import type { User, UserRole } from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  completeWelcome: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const login = useCallback((email: string, _password: string) => {
    // Mock: find user by email, or default to client
    const found = mockUsers.find((u) => u.email === email);
    if (found) {
      setUser(found);
      setIsFirstLogin(found.role === "client"); // Simulate first login for clients
      return true;
    }
    // Default: log in as client demo
    const clientUser = mockUsers.find((u) => u.role === "client")!;
    setUser(clientUser);
    setIsFirstLogin(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsFirstLogin(false);
  }, []);

  const completeWelcome = useCallback(() => {
    setIsFirstLogin(false);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const found = mockUsers.find((u) => u.role === role);
    if (found) {
      setUser(found);
      setIsFirstLogin(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isFirstLogin,
        login,
        logout,
        completeWelcome,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
