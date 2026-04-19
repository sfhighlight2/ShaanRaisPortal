/**
 * Unit tests for src/lib/edgeFetch.ts
 *
 * Covers:
 * - Happy path: returns JSON body
 * - No session: throws authentication error
 * - HTTP error (non-ok): extracts error message from body
 * - HTTP error: falls back to generic message when body has no error field
 * - AbortError (timeout): throws human-readable timeout message
 * - JSON body-level error: throws when json.error is set
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { edgeFetch } from "@/lib/edgeFetch";

// ── Mock Supabase ────────────────────
// We need to control what getSession() returns per-test.
const mockGetSession = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// ── Helpers ──────────────────────────
const MOCK_URL = "http://localhost:54321";
const sessionWithToken = {
  data: { session: { access_token: "tok-abc123" } },
};
const noSession = { data: { session: null } };

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", MOCK_URL);
  mockGetSession.mockResolvedValue(sessionWithToken);
});

describe("edgeFetch", () => {
  it("returns parsed JSON on a successful 200 response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: "ok", count: 42 }),
    } as Response);

    const result = await edgeFetch<{ result: string; count: number }>(
      "my-function",
      { foo: "bar" }
    );

    expect(result).toEqual({ result: "ok", count: 42 });
    expect(global.fetch).toHaveBeenCalledOnce();

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("/functions/v1/my-function");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer tok-abc123");
    expect(JSON.parse(opts.body)).toEqual({ foo: "bar" });
  });

  it("throws an auth error when there is no active session", async () => {
    mockGetSession.mockResolvedValueOnce(noSession);

    await expect(edgeFetch("my-function", {})).rejects.toThrow(
      "No active session. Please sign in again."
    );
  });

  it("throws an error with the server message on a non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid package ID" }),
    } as Response);

    await expect(edgeFetch("assign-package", { client_id: "x" })).rejects.toThrow(
      "Invalid package ID"
    );
  });

  it("throws a generic message when non-ok response has no structured error body", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(edgeFetch("assign-package", {})).rejects.toThrow(
      `Edge function "assign-package" failed (HTTP 500)`
    );
  });

  it("throws a timeout error when the request is aborted", async () => {
    // Simulate AbortError
    global.fetch = vi.fn().mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted."), { name: "AbortError" })
    );

    await expect(edgeFetch("my-function", {}, 100)).rejects.toThrow(
      "Request timed out. Please try again."
    );
  });

  it("throws when the JSON body contains an 'error' field", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "downstream service unavailable" }),
    } as Response);

    await expect(edgeFetch("assign-package", {})).rejects.toThrow(
      "downstream service unavailable"
    );
  });

  it("re-throws non-abort fetch errors as-is", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network failure"));

    await expect(edgeFetch("my-function", {})).rejects.toThrow("Network failure");
  });
});
