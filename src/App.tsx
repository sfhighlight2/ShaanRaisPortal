import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import HelpCenter from "./pages/HelpCenter";

// Client pages
import ClientDashboard from "./pages/client/Dashboard";
import ClientTasks from "./pages/client/Tasks";
import ClientDeliverables from "./pages/client/Deliverables";
import ClientDocuments from "./pages/client/Documents";
import ClientUpdates from "./pages/client/Updates";
import ClientProfile from "./pages/client/Profile";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminClientDetail from "./pages/admin/ClientDetail";
import AdminTemplates from "./pages/admin/Templates";
import AdminQuestions from "./pages/admin/Questions";
import AdminTeam from "./pages/admin/Team";
import AdminSettings from "./pages/admin/Settings";
import AdminOnboarding from "./pages/admin/Onboarding";
import AdminResources from "./pages/admin/Resources";
import AdminOnboardingManagement from "./pages/admin/OnboardingManagement";
import AdminResourcesManagement from "./pages/admin/ResourcesManagement";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isFirstLogin, user } = useAuth();

  // Not authenticated → login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // First login for clients → welcome
  if (isFirstLogin && user?.role === "client") {
    return (
      <Routes>
        <Route path="*" element={<Welcome />} />
      </Routes>
    );
  }

  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";

  return (
    <AppLayout>
      <Routes>
        {/* Client routes */}
        <Route path="/dashboard" element={<ClientDashboard />} />
        <Route path="/tasks" element={<ClientTasks />} />
        <Route path="/deliverables" element={<ClientDeliverables />} />
        <Route path="/documents" element={<ClientDocuments />} />
        <Route path="/updates" element={<ClientUpdates />} />
        <Route path="/profile" element={<ClientProfile />} />
        <Route path="/help" element={<HelpCenter />} />

        {/* Admin routes (protected) */}
        {isAdmin && (
          <>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/clients" element={<AdminClients />} />
            <Route path="/admin/clients/:clientId" element={<AdminClientDetail />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/questions" element={<AdminQuestions />} />
            {user?.role === "admin" && (
              <Route path="/admin/team" element={<AdminTeam />} />
            )}
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/onboarding" element={<AdminOnboarding />} />
            <Route path="/admin/resources" element={<AdminResources />} />
            <Route path="/admin/onboarding-management" element={<AdminOnboardingManagement />} />
            <Route path="/admin/resources-management" element={<AdminResourcesManagement />} />
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
