import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { AppLayout } from "@/components/layout/AppLayout";

const Login = lazy(() => import("./pages/Login"));
const Welcome = lazy(() => import("./pages/Welcome"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));

// Client pages
const ClientDashboard = lazy(() => import("./pages/client/Dashboard"));
const ClientTasks = lazy(() => import("./pages/client/Tasks"));
const ClientDeliverables = lazy(() => import("./pages/client/Deliverables"));
const ClientDocuments = lazy(() => import("./pages/client/Documents"));
const ClientLinks = lazy(() => import("./pages/client/Links"));
const ClientUpdates = lazy(() => import("./pages/client/Updates"));
const ClientProfile = lazy(() => import("./pages/client/Profile"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminClients = lazy(() => import("./pages/admin/Clients"));
const AdminClientDetail = lazy(() => import("./pages/admin/ClientDetail"));
const AdminTemplates = lazy(() => import("./pages/admin/Templates"));
const AdminQuestions = lazy(() => import("./pages/admin/Questions"));
const AdminTeam = lazy(() => import("./pages/admin/Team"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminOnboarding = lazy(() => import("./pages/admin/Onboarding"));
const AdminResources = lazy(() => import("./pages/admin/Resources"));
const AdminOnboardingManagement = lazy(() => import("./pages/admin/OnboardingManagement"));
const AdminResourcesManagement = lazy(() => import("./pages/admin/ResourcesManagement"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 2 minutes — prevents redundant refetches on page navigation
      staleTime: 2 * 60 * 1000,
      // Retry failed queries once (not 3 times)
      retry: 1,
      // Don't refetch when browser window regains focus (avoids jarring reloads)
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, isFirstLogin, user } = useAuth();

  // Not authenticated → login
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  // First login for clients → welcome
  if (isFirstLogin && user?.role === "client") {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
        <Routes>
          <Route path="*" element={<Welcome />} />
        </Routes>
      </Suspense>
    );
  }

  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";

  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
        <Routes>
          {/* Client routes */}
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/tasks" element={<ClientTasks />} />
          <Route path="/deliverables" element={<ClientDeliverables />} />
          <Route path="/documents" element={<ClientDocuments />} />
          <Route path="/links" element={<ClientLinks />} />
          <Route path="/updates" element={<ClientUpdates />} />
          <Route path="/profile" element={<ClientProfile />} />
          <Route path="/help" element={<HelpCenter />} />

          {/* Admin routes (protected) */}
          {isAdmin && (
            <>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/clients/:clientId" element={<AdminClientDetail />} />
              <Route path="/admin/questions" element={<AdminQuestions />} />
              {user?.role === "admin" && (
                <Route path="/admin/team" element={<AdminTeam />} />
              )}
              <Route path="/admin/users" element={<AdminUsers />} />
              {user?.role === "admin" && (
                <Route path="/admin/templates" element={<AdminTemplates />} />
              )}
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/onboarding" element={<AdminOnboarding />} />
              <Route path="/admin/resources" element={<AdminResources />} />
              <Route path="/admin/onboarding-management" element={<AdminOnboardingManagement />} />
              <Route path="/admin/resources-management" element={<AdminResourcesManagement />} />
            </>
          )}

          {/* Admin/manager impersonation: client-view routes */}
          {isAdmin && (
            <>
              <Route path="/admin/clients/:clientId/view/dashboard" element={<ClientDashboard />} />
              <Route path="/admin/clients/:clientId/view/tasks" element={<ClientTasks />} />
              <Route path="/admin/clients/:clientId/view/deliverables" element={<ClientDeliverables />} />
              <Route path="/admin/clients/:clientId/view/documents" element={<ClientDocuments />} />
              <Route path="/admin/clients/:clientId/view/links" element={<ClientLinks />} />
              <Route path="/admin/clients/:clientId/view/updates" element={<ClientUpdates />} />
            </>
          )}

          {/* Authenticated users visiting /login get sent home */}
          <Route path="/login" element={<Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />

          {/* Root redirect based on role */}
          <Route
            path="/"
            element={<Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <NotificationsProvider>
              <AppRoutes />
            </NotificationsProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
