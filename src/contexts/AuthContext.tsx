import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User, UserRole } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  completeWelcome: () => void;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch profile from DB and shape into the app's User type
  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      role: data.role as UserRole,
      profilePhoto: data.profile_photo ?? undefined,
      status: data.status,
      createdAt: data.created_at,
    };
  }, []);

  // On mount: restore session if one exists
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Try to find profile by auth user id, then by email (for seeded profiles)
        let profile = await fetchProfile(session.user.id);
        if (!profile) {
          // Fallback: look up by email (seeded profile with placeholder id)
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", session.user.email)
            .single();
          if (data) {
            profile = {
              id: data.id,
              firstName: data.first_name,
              lastName: data.last_name,
              email: data.email,
              role: data.role as UserRole,
              profilePhoto: data.profile_photo ?? undefined,
              status: data.status,
              createdAt: data.created_at,
            };
          }
        }
        setUser(profile);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let profile = await fetchProfile(session.user.id);
        if (!profile) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", session.user.email)
            .single();
          if (data) {
            profile = {
              id: data.id,
              firstName: data.first_name,
              lastName: data.last_name,
              email: data.email,
              role: data.role as UserRole,
              profilePhoto: data.profile_photo ?? undefined,
              status: data.status,
              createdAt: data.created_at,
            };
          }
        }
        setUser(profile);
        if (event === "SIGNED_IN" && profile?.role === "client") {
          setIsFirstLogin(true);
        }
      } else {
        setUser(null);
        setIsFirstLogin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsFirstLogin(false);
  }, []);

  const completeWelcome = useCallback(() => {
    setIsFirstLogin(false);
  }, []);

  // Dev-only: switch role by signing in as a different demo user
  const switchRole = useCallback(async (role: UserRole) => {
    const roleEmails: Record<UserRole, string> = {
      admin: "sarah@shaanrais.com",
      manager: "james@shaanrais.com",
      team_member: "aisha@shaanrais.com",
      client: "david@thorntongroup.com",
    };
    const email = roleEmails[role];
    if (email) {
      await supabase.auth.signInWithPassword({ email, password: "Demo1234!" });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isFirstLogin, login, logout, completeWelcome, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
