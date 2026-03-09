import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import ClientDashboard from "./pages/client/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isFirstLogin, user } = useAuth();

  // Not authenticated → login
  if (!isAuthenticated) {
    return (
      <Routes>
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
        <Route path="/tasks" element={<ClientDashboard />} />
        <Route path="/deliverables" element={<ClientDashboard />} />
        <Route path="/documents" element={<ClientDashboard />} />
        <Route path="/updates" element={<ClientDashboard />} />
        <Route path="/profile" element={<ClientDashboard />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/clients" element={<AdminDashboard />} />
        <Route path="/admin/templates" element={<AdminDashboard />} />
        <Route path="/admin/questions" element={<AdminDashboard />} />
        <Route path="/admin/team" element={<AdminDashboard />} />
        <Route path="/admin/settings" element={<AdminDashboard />} />

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
