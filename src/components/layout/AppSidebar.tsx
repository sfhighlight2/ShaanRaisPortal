import React from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, CheckSquare, Package, FileText,
  Bell, User, Settings, Users, Inbox, ClipboardList, BarChart3, Blocks,
  GraduationCap, BookOpen, HelpCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { mockNotifications } from "@/lib/mock-data";
import logoImg from "@/assets/shaan-rais-logo.png";

const clientNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Deliverables", url: "/deliverables", icon: Package },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Updates", url: "/updates", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Help", url: "/help", icon: HelpCircle },
];

const adminNav = [
  { title: "Overview", url: "/admin", icon: BarChart3 },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Templates", url: "/admin/templates", icon: Blocks },
  { title: "Questions", url: "/admin/questions", icon: Inbox },
  { title: "Team", url: "/admin/team", icon: Users },
  { title: "Onboarding Mgmt", url: "/admin/onboarding-management", icon: GraduationCap },
  { title: "Resources Mgmt", url: "/admin/resources-management", icon: BookOpen },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Help", url: "/help", icon: HelpCircle },
];

const managerNav = [
  { title: "Overview", url: "/admin", icon: BarChart3 },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Templates", url: "/admin/templates", icon: Blocks },
  { title: "Questions", url: "/admin/questions", icon: Inbox },
  { title: "Team", url: "/admin/team", icon: Users },
  { title: "Onboarding", url: "/admin/onboarding", icon: GraduationCap },
  { title: "Resources", url: "/admin/resources", icon: BookOpen },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Help", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { user, logout, switchRole } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";
  const nav = isAdmin
    ? (user?.role === "admin" ? adminNav : managerNav)
    : clientNav;
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="py-4">
        {/* Logo */}
        <div className="px-4 mb-6 flex justify-center">
          {!collapsed ? (
            <img src={logoImg} alt="Shaan Rais Media" className="h-24 w-auto" />
          ) : (
            <img src={logoImg} alt="Shaan Rais Media" className="h-10 w-10 object-contain" />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[11px] uppercase tracking-widest font-medium">
            {isAdmin ? "Management" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`relative transition-colors ${isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        activeClassName=""
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                        {item.title === "Updates" && !collapsed && unreadCount > 0 && (
                          <Badge className="ml-auto h-5 min-w-5 text-[10px] bg-primary text-primary-foreground">
                            {unreadCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="space-y-3">
            {/* Role switcher — dev only, never shown in production */}
            {import.meta.env.DEV && (
              <div className="flex gap-1 flex-wrap">
                {(["client", "admin", "manager"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    className={`text-[10px] px-2 py-1 rounded-md transition-colors ${user?.role === role
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground"
                      }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
            {/* User info */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-foreground">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-sidebar-foreground truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-sidebar-muted truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-xs text-sidebar-muted hover:text-sidebar-foreground py-1.5 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
