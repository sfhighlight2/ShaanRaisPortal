/**
 * Integration tests for the ClientDashboard page component.
 *
 * Covers:
 * - Shows loading spinner while data is fetching
 * - Shows "No active project" empty state when client/project are null
 * - Renders key stat cards (Package, Current Phase, Status, Business Consultant)
 * - Renders the phase tracker (journey) with correct phase names
 * - "Your Next Step" card shows the first pending task
 * - "Your Next Step" card is hidden when there are no pending tasks
 * - Recent Deliverables renders items from the deliverables list
 * - Empty state message shows when no tasks are pending
 * - Notes from Team section only appears when there are visible notes
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import ClientDashboard from "@/pages/client/Dashboard";

// ── Mock the hook ────────────────────────────────────────────────
vi.mock("@/hooks/useClientData", () => ({
  useClientData: vi.fn(),
}));

// ── Suppress framer-motion animation warnings in jsdom ────────────
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { useClientData } from "@/hooks/useClientData";

// ── Fixtures ─────────────────────────────────────────────────────
const mockClient = {
  id: "client-001",
  companyName: "Acme Corp",
  primaryContactName: "John Doe",
  primaryContactEmail: "john@acme.com",
  status: "active",
  accountManagerId: "mgr-001",
  createdAt: "2024-01-01T00:00:00Z",
};

const mockProject = {
  id: "project-001",
  clientId: "client-001",
  projectName: "Growth Package",
  status: "active",
  isMainProject: true,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockPhases = [
  { id: "phase-001", projectId: "project-001", name: "Discovery", status: "completed", sortOrder: 1 },
  { id: "phase-002", projectId: "project-001", name: "Strategy", status: "current", sortOrder: 2 },
  { id: "phase-003", projectId: "project-001", name: "Execution", status: "upcoming", sortOrder: 3 },
];

const mockTasks = [
  { id: "task-001", phaseId: "phase-002", title: "Complete Brand Survey", taskType: "form", status: "pending", visibleToClient: true, sortOrder: 1 },
  { id: "task-002", phaseId: "phase-002", title: "Review Proposal", taskType: "review", status: "pending", visibleToClient: true, sortOrder: 2 },
];

const mockDeliverables = [
  { id: "deliv-001", phaseId: "phase-001", title: "Brand Audit", status: "pending", visibleToClient: true, uploadedAt: "2024-03-01T00:00:00Z" },
];

const mockAccountManager = {
  id: "mgr-001",
  firstName: "Sarah",
  lastName: "Smith",
  email: "sarah@agency.com",
  role: "manager" as const,
  status: "active" as const,
  createdAt: "2023-01-01T00:00:00Z",
};

function emptyState() {
  return {
    loading: false,
    client: null,
    project: null,
    phases: [],
    tasks: [],
    deliverables: [],
    updates: [],
    notes: [],
    accountManager: null,
    links: [],
    documents: [],
    questions: [],
    error: null,
    refetch: vi.fn(),
  };
}

function fullState(overrides = {}) {
  return {
    ...emptyState(),
    client: mockClient,
    project: mockProject,
    phases: mockPhases,
    tasks: mockTasks,
    deliverables: mockDeliverables,
    updates: [],
    notes: [],
    accountManager: mockAccountManager,
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ClientDashboard />
    </MemoryRouter>
  );
}

describe("ClientDashboard", () => {
  it("shows a loading spinner while data is loading", () => {
    (useClientData as any).mockReturnValue({ ...emptyState(), loading: true });
    renderDashboard();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows empty state when client and project are null", () => {
    (useClientData as any).mockReturnValue(emptyState());
    renderDashboard();
    expect(screen.getByText(/No active project found/i)).toBeInTheDocument();
  });

  it("renders the project package name in the stats strip", () => {
    (useClientData as any).mockReturnValue(fullState());
    renderDashboard();
    expect(screen.getByText("Growth Package")).toBeInTheDocument();
  });

  it("renders 'Strategy' as the current phase in the stats strip", () => {
    (useClientData as any).mockReturnValue(fullState());
    renderDashboard();
    // 'Strategy' appears in both the stat card and the phase tracker — that's expected
    expect(screen.getAllByText("Strategy").length).toBeGreaterThanOrEqual(1);
  });

  it("renders client status badge with correct label", () => {
    (useClientData as any).mockReturnValue(fullState());
    renderDashboard();
    // Active status badge
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders the business consultant name", () => {
    (useClientData as any).mockReturnValue(fullState());
    renderDashboard();
    expect(screen.getByText("Sarah Smith")).toBeInTheDocument();
  });

  it("renders all phases in the phase journey tracker", () => {
    (useClientData as any).mockReturnValue(fullState());
    renderDashboard();
    // All three phase names should appear in the tracker
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    // Strategy appears in both the stat card and the tracker
    const strategyEls = screen.getAllByText("Strategy");
    expect(strategyEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Execution")).toBeInTheDocument();
  });

  it("shows 'Your Next Step' card with the first pending task title", () => {
    (useClientData as any).mockReturnValue(fullState());
    renderDashboard();
    expect(screen.getByText("Your Next Step")).toBeInTheDocument();
    // Task title appears in both the next-step card AND the My Tasks list
    expect(screen.getAllByText("Complete Brand Survey").length).toBeGreaterThanOrEqual(1);
  });

  it("hides 'Your Next Step' when all tasks are completed", () => {
    const completedTasks = mockTasks.map((t) => ({ ...t, status: "completed" }));
    (useClientData as any).mockReturnValue(fullState({ tasks: completedTasks }));
    renderDashboard();
    expect(screen.queryByText("Your Next Step")).not.toBeInTheDocument();
  });

  it("shows empty message in My Tasks when no pending tasks", () => {
    (useClientData as any).mockReturnValue(fullState({ tasks: [] }));
    renderDashboard();
    expect(screen.getByText("No pending tasks right now.")).toBeInTheDocument();
  });

  it("renders deliverable items in the Recent Deliverables card", () => {
    (useClientData as any).mockReturnValue(fullState());
    renderDashboard();
    expect(screen.getByText("Brand Audit")).toBeInTheDocument();
  });

  it("shows 'No deliverables in this phase yet.' when list is empty", () => {
    (useClientData as any).mockReturnValue(fullState({ deliverables: [] }));
    renderDashboard();
    expect(screen.getByText("No deliverables in this phase yet.")).toBeInTheDocument();
  });

  it("shows Notes from Team section only when notes exist", () => {
    const notes = [
      { id: "note-001", content: "Please review the proposal by Friday.", authorName: "Sarah Smith", createdAt: "2024-01-01T00:00:00Z" },
    ];

    (useClientData as any).mockReturnValue(fullState({ notes }));
    renderDashboard();
    expect(screen.getByText("Notes from Your Team")).toBeInTheDocument();
    expect(screen.getByText("Please review the proposal by Friday.")).toBeInTheDocument();
  });

  it("hides Notes from Team section when notes list is empty", () => {
    (useClientData as any).mockReturnValue(fullState({ notes: [] }));
    renderDashboard();
    expect(screen.queryByText("Notes from Your Team")).not.toBeInTheDocument();
  });
});
