import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockNotifications } from "@/lib/mock-data";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-5 sticky top-0 z-30 shadow-[0_1px_3px_0_hsl(0_0%_0%/0.04)]">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {getGreeting()}, <span className="text-foreground font-medium">{user?.firstName}</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 text-[9px] bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
          </header>
          {/* Main content */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
