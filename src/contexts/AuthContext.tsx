import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User, UserRole } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, profile_photo, status, created_at")
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
    if (!isSupabaseConfigured) {
      console.warn("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    // Track whether the initial session check is still in progress so that the
    // INITIAL_SESSION event fired by onAuthStateChange doesn't duplicate the work.
    let initDone = false;

    const init = async () => {
      try {
        // Race the session check against a timeout to prevent hanging on
        // browsers with strict cookie/storage policies (Safari Private, Brave, etc.)
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => {
              console.warn("Auth session check timed out after 3 seconds.");
              resolve({ data: { session: null } });
            }, 3_000)
          ),
        ]);
        const session = sessionResult.data.session;
        if (session?.user) {
          let profile = await fetchProfile(session.user.id);
          if (!profile) {
            const { data } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, email, role, profile_photo, status, created_at")
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
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        initDone = true;
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the synthetic INITIAL_SESSION event — init() handles that.
      if (event === "INITIAL_SESSION") return;
      // Also skip if init() hasn't completed yet; it will set the user itself.
      if (!initDone && event === "SIGNED_IN") return;

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
    if (!isSupabaseConfigured) {
      console.error("Login failed: Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return false;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    return true;
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsFirstLogin(false);
  }, []);

  const completeWelcome = useCallback(() => {
    setIsFirstLogin(false);
  }, []);

  // Dev-only: switch role by signing in as a different demo user
  // This function is only callable from the dev role-switcher UI (import.meta.env.DEV guard).
  // The additional check here ensures it can never execute in a production build.
  const switchRole = useCallback(async (role: UserRole) => {
    if (!isSupabaseConfigured || !import.meta.env.DEV) return;
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
