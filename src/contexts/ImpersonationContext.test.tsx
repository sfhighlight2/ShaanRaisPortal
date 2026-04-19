/**
 * Unit tests for ImpersonationContext
 *
 * Covers:
 * - Initial state: not impersonating
 * - startImpersonation: sets clientId, clientName, isImpersonating → true
 * - stopImpersonation: clears all state, isImpersonating → false
 * - useImpersonation: throws when used outside its provider
 */
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import {
  ImpersonationProvider,
  useImpersonation,
} from "@/contexts/ImpersonationContext";

// ── Test harness: a component that exposes context values via the DOM ──
function ImpersonationHarness() {
  const { impersonatedClientId, impersonatedClientName, isImpersonating, startImpersonation, stopImpersonation } =
    useImpersonation();

  return (
    <div>
      <p data-testid="client-id">{impersonatedClientId ?? "null"}</p>
      <p data-testid="client-name">{impersonatedClientName ?? "null"}</p>
      <p data-testid="is-impersonating">{String(isImpersonating)}</p>
      <button
        onClick={() => startImpersonation("client-001", "Acme Corp")}
        data-testid="btn-start"
      >
        Start
      </button>
      <button onClick={stopImpersonation} data-testid="btn-stop">
        Stop
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ImpersonationProvider>
      <ImpersonationHarness />
    </ImpersonationProvider>
  );
}

describe("ImpersonationContext", () => {
  it("starts with no impersonation state", () => {
    renderWithProvider();
    expect(screen.getByTestId("client-id")).toHaveTextContent("null");
    expect(screen.getByTestId("client-name")).toHaveTextContent("null");
    expect(screen.getByTestId("is-impersonating")).toHaveTextContent("false");
  });

  it("sets client ID, name, and isImpersonating=true on startImpersonation", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId("btn-start"));

    expect(screen.getByTestId("client-id")).toHaveTextContent("client-001");
    expect(screen.getByTestId("client-name")).toHaveTextContent("Acme Corp");
    expect(screen.getByTestId("is-impersonating")).toHaveTextContent("true");
  });

  it("clears all impersonation state on stopImpersonation", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId("btn-start"));
    // Confirm it's active
    expect(screen.getByTestId("is-impersonating")).toHaveTextContent("true");

    await user.click(screen.getByTestId("btn-stop"));

    expect(screen.getByTestId("client-id")).toHaveTextContent("null");
    expect(screen.getByTestId("client-name")).toHaveTextContent("null");
    expect(screen.getByTestId("is-impersonating")).toHaveTextContent("false");
  });

  it("throws when useImpersonation is used outside its provider", () => {
    // Suppress the React error boundary output in test stdout
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    function BadComponent() {
      useImpersonation();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      "useImpersonation must be used within ImpersonationProvider"
    );

    spy.mockRestore();
  });
});
