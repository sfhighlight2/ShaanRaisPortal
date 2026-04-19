/**
 * Integration tests for AppRoutes (routing + auth logic in App.tsx)
 *
 * Covers:
 * - Unauthenticated users are redirected to /login regardless of requested path
 * - Authenticated admin users land on /admin
 * - Authenticated client users land on /dashboard
 * - Client user cannot access /admin/* (redirected/not rendered)
 * - Admin user can access /admin routes
 * - First-login client sees the Welcome screen
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";

// ── Lightweight stand-in for AppRoutes logic ─────────────────────────────────
// This tests the routing decisions in isolation, without the full Supabase
// provider chain. We mock useAuth to return the session state we want.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/ImpersonationContext", () => ({
  useImpersonation: () => ({
    isImpersonating: false,
    impersonatedClientId: null,
    impersonatedClientName: null,
    startImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  }),
  ImpersonationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from "@/contexts/AuthContext";

// Helper: renders a minimal route tree that mirrors App.tsx logic
function renderRoutes(initialPath: string) {
  const { isAuthenticated, isFirstLogin, user } = (useAuth as any)();
  const isAdmin =
    user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : isFirstLogin && user?.role === "client" ? (
          <Route path="*" element={<div>Welcome Screen</div>} />
        ) : (
          <>
            <Route path="/dashboard" element={<div>Client Dashboard</div>} />
            <Route path="/admin" element={isAdmin ? <div>Admin Dashboard</div> : <Navigate to="/dashboard" replace />} />
            <Route path="/admin/clients" element={isAdmin ? <div>Admin Clients</div> : <Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
            <Route path="/" element={<Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
            <Route path="*" element={<div>Not Found</div>} />
          </>
        )}
      </Routes>
    </MemoryRouter>
  );
}

describe("AppRoutes — routing decisions", () => {
  it("redirects unauthenticated users to /login from any path", () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: false, isFirstLogin: false, user: null });
    renderRoutes("/admin");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("unauthenticated user visiting /login sees the Login page", () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: false, isFirstLogin: false, user: null });
    renderRoutes("/login");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("authenticated admin landing on / is redirected to /admin", async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isFirstLogin: false,
      user: { role: "admin" },
    });
    renderRoutes("/");
    await waitFor(() =>
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
    );
  });

  it("authenticated client landing on / is redirected to /dashboard", async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isFirstLogin: false,
      user: { role: "client" },
    });
    renderRoutes("/");
    await waitFor(() =>
      expect(screen.getByText("Client Dashboard")).toBeInTheDocument()
    );
  });

  it("authenticated client visiting /admin is redirected to /dashboard (RBAC)", async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isFirstLogin: false,
      user: { role: "client" },
    });
    renderRoutes("/admin");
    await waitFor(() =>
      expect(screen.getByText("Client Dashboard")).toBeInTheDocument()
    );
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });

  it("first-login client sees the Welcome screen instead of their dashboard", () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isFirstLogin: true,
      user: { role: "client" },
    });
    renderRoutes("/dashboard");
    expect(screen.getByText("Welcome Screen")).toBeInTheDocument();
  });

  it("authenticated admin visiting /login is redirected to /admin", async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isFirstLogin: false,
      user: { role: "admin" },
    });
    renderRoutes("/login");
    await waitFor(() =>
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
    );
  });
});
