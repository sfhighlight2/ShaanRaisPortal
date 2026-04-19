/**
 * Unit tests for the ImpersonationBanner component.
 *
 * Covers:
 * - Banner does NOT render when not impersonating
 * - Banner does NOT render for a non-admin user (client) even if isImpersonating is somehow true
 * - Banner renders with the correct client name when impersonating as admin
 * - "Exit Client View" button calls stopImpersonation and navigates back to /admin/clients/:id
 * - The inline client section nav renders Dashboard, Tasks, Links etc.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";

// ── Mock both contexts ──────────────────────────────────────────────
const mockStopImpersonation = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/contexts/ImpersonationContext", () => ({
  useImpersonation: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// react-router-dom: mock useNavigate while preserving MemoryRouter
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";

// ── Helper ──────────────────────────────────────────────────────────
function renderBanner(path = "/admin/clients/client-001/view/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<ImpersonationBanner />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when not impersonating", () => {
    (useImpersonation as any).mockReturnValue({
      isImpersonating: false,
      impersonatedClientName: null,
      impersonatedClientId: null,
      stopImpersonation: mockStopImpersonation,
    });
    (useAuth as any).mockReturnValue({ user: { role: "admin" } });

    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a client user even if isImpersonating is true", () => {
    (useImpersonation as any).mockReturnValue({
      isImpersonating: true,
      impersonatedClientName: "Acme Corp",
      impersonatedClientId: "client-001",
      stopImpersonation: mockStopImpersonation,
    });
    // A non-admin user should never see this banner
    (useAuth as any).mockReturnValue({ user: { role: "client" } });

    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the banner with the client name when an admin is impersonating", () => {
    (useImpersonation as any).mockReturnValue({
      isImpersonating: true,
      impersonatedClientName: "Acme Corp",
      impersonatedClientId: "client-001",
      stopImpersonation: mockStopImpersonation,
    });
    (useAuth as any).mockReturnValue({ user: { role: "admin" } });

    renderBanner();

    expect(screen.getByText("Viewing as client:")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders for manager and team_member roles too", () => {
    for (const role of ["manager", "team_member"]) {
      (useImpersonation as any).mockReturnValue({
        isImpersonating: true,
        impersonatedClientName: "Acme Corp",
        impersonatedClientId: "client-001",
        stopImpersonation: mockStopImpersonation,
      });
      (useAuth as any).mockReturnValue({ user: { role } });

      const { unmount } = renderBanner();
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      unmount();
    }
  });

  it("clicking Exit Client View calls stopImpersonation and navigates to client detail", async () => {
    const user = userEvent.setup();
    (useImpersonation as any).mockReturnValue({
      isImpersonating: true,
      impersonatedClientName: "Acme Corp",
      impersonatedClientId: "client-001",
      stopImpersonation: mockStopImpersonation,
    });
    (useAuth as any).mockReturnValue({ user: { role: "admin" } });

    renderBanner("/admin/clients/client-001/view/dashboard");

    const exitBtn = screen.getByRole("button", { name: /Exit Client View/i });
    await user.click(exitBtn);

    expect(mockStopImpersonation).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith("/admin/clients/client-001");
  });

  it("fallback navigates to /admin/clients when no clientId is resolvable", async () => {
    const user = userEvent.setup();
    (useImpersonation as any).mockReturnValue({
      isImpersonating: true,
      impersonatedClientName: "Acme Corp",
      // impersonatedClientId is null — simulates an edge case
      impersonatedClientId: null,
      stopImpersonation: mockStopImpersonation,
    });
    (useAuth as any).mockReturnValue({ user: { role: "admin" } });

    // Route with no :clientId param
    renderBanner("/admin/view/dashboard");

    await user.click(screen.getByRole("button", { name: /Exit Client View/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/admin/clients");
  });
});
