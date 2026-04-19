/**
 * NotificationsContext
 *
 * Centralises the notifications query so AppLayout (full row data)
 * and AppSidebar (unread count) both consume the same cached response —
 * eliminating the duplicate Supabase round-trip that previously occurred
 * on every authenticated page.
 *
 * Data is kept fresh for 60 seconds. The popover opens against
 * already-cached data instantly, with a silent background refetch.
 */
import React, { createContext, useContext, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["notifications", user?.id ?? null] as const;

  const { data = [], isLoading } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      if (!user || !isSupabaseConfigured) return [];
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, read, created_at, link")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Notification[];
    },
    enabled: !!user && isSupabaseConfigured,
    // Recheck every 60 s — notifications don't need real-time accuracy
    staleTime: 60_000,
    // Refetch in background when tab regains focus after >2 min away
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (isSupabaseConfigured) {
        await supabase.from("notifications").update({ read: true }).eq("id", id);
      }
    },
    // Optimistic update — UI reflects the change instantly
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Notification[]>(queryKey, (prev = []) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
  }).mutate;

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (isSupabaseConfigured && user) {
        await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Notification[]>(queryKey, (prev = []) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    },
  }).mutate;

  const unreadCount = data.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications: data, unreadCount, isLoading, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
