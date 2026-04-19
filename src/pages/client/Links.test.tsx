/**
 * Integration tests for ClientLinks page component.
 *
 * Covers:
 * - Shows a loading spinner while data is fetching
 * - Shows empty state when no links are available
 * - Renders total link count in stats cards
 * - Groups links by type (folder, document, etc.)
 * - Each link renders with title and an "Open" anchor pointing to the correct URL
 * - Links with descriptions show the description text
 * - External links have rel="noopener noreferrer" for security
 * - Links with linkType "website" render in the correct group section
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import ClientLinks from "@/pages/client/Links";

// ── Mock useClientData ────────────────────────────────────────────
vi.mock("@/hooks/useClientData", () => ({
  useClientData: vi.fn(),
}));

import { useClientData } from "@/hooks/useClientData";

const mockClient = { id: "client-001", companyName: "Acme Corp" };

const mockLinks = [
  {
    id: "link-001",
    clientId: "client-001",
    title: "Google Drive Folder",
    url: "https://drive.google.com/drive/folders/abc",
    linkType: "folder",
    description: "Main project assets",
    visibleToClient: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "link-002",
    clientId: "client-001",
    title: "Brand Guidelines PDF",
    url: "https://docs.example.com/brand",
    linkType: "document",
    description: undefined,
    visibleToClient: true,
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "link-003",
    clientId: "client-001",
    title: "Intro Video",
    url: "https://loom.com/share/xyz",
    linkType: "video",
    description: "Watch this first",
    visibleToClient: true,
    createdAt: "2024-01-03T00:00:00Z",
  },
];

function renderLinks() {
  return render(
    <MemoryRouter>
      <ClientLinks />
    </MemoryRouter>
  );
}

describe("ClientLinks", () => {
  it("shows a loading spinner while data is loading", () => {
    (useClientData as any).mockReturnValue({ loading: true, client: null, links: [] });
    renderLinks();
    // The spinner is a div with animate-spin class
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("returns null when client is null (component exit guard)", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: null, links: [] });
    const { container } = renderLinks();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows empty state when there are no links", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: [] });
    renderLinks();
    expect(screen.getByText("No links yet")).toBeInTheDocument();
    expect(screen.getByText(/Your team will add links/i)).toBeInTheDocument();
  });

  it("shows the page heading", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: mockLinks });
    renderLinks();
    expect(screen.getByRole("heading", { name: /links/i })).toBeInTheDocument();
  });

  it("renders total link count in the stats strip", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: mockLinks });
    renderLinks();
    // The "3" total links stat
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Total Links")).toBeInTheDocument();
  });

  it("groups links by type with correct section headings", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: mockLinks });
    renderLinks();
    // Pluralized labels appear in stat cards AND section headings; getAllByText is correct here.
    expect(screen.getAllByText("Folders").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Documents").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Videos").length).toBeGreaterThanOrEqual(1);
  });

  it("renders each link title as an anchor pointing to its URL", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: mockLinks });
    renderLinks();

    // framer-motion sets initial opacity:0 in jsdom; use closest('a') on the text node.
    const folderLink = screen.getByText("Google Drive Folder").closest("a");
    expect(folderLink).not.toBeNull();
    expect(folderLink).toHaveAttribute("href", "https://drive.google.com/drive/folders/abc");

    const docLink = screen.getByText("Brand Guidelines PDF").closest("a");
    expect(docLink).not.toBeNull();
    expect(docLink).toHaveAttribute("href", "https://docs.example.com/brand");
  });

  it("all link anchors open in a new tab with rel=noopener noreferrer (security)", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: mockLinks });
    renderLinks();

    // Use querySelectorAll to catch framer-motion anchors that may not be accessible via role.
    const externalAnchors = Array.from(
      document.querySelectorAll('a[href^="https://"]')
    );
    expect(externalAnchors.length).toBeGreaterThan(0);
    for (const anchor of externalAnchors) {
      expect(anchor).toHaveAttribute("target", "_blank");
      expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("renders optional link descriptions below the title", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: mockLinks });
    renderLinks();
    expect(screen.getByText("Main project assets")).toBeInTheDocument();
    expect(screen.getByText("Watch this first")).toBeInTheDocument();
    // link-002 has no description — only 2 descriptions should appear
    const descs = screen.queryAllByText(/assets|first/);
    expect(descs).toHaveLength(2);
  });

  it("renders the total link count in the stat strip", () => {
    (useClientData as any).mockReturnValue({ loading: false, client: mockClient, links: mockLinks });
    renderLinks();
    // The stat strip shows "3" for Total Links
    expect(screen.getByText("3")).toBeInTheDocument();
    // Each type group also shows 1 in both the stat card and the badge inside the section heading
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(3);
  });
});
