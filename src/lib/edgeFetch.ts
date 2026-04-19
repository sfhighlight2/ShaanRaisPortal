/**
 * Shared utility for calling Supabase Edge Functions with built-in timeout,
 * response-status checking, and structured error handling.
 *
 * Replaces all inline `fetch(...)` calls to Edge Functions throughout the app
 * so that every call automatically:
 *   1. Grabs the current session token
 *   2. Aborts after `timeoutMs` (default 12 s) to prevent "stuck" UI
 *   3. Throws a human-readable error on HTTP failures or JSON { error } payloads
 */
import { supabase } from "@/lib/supabase";

export async function edgeFetch<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  timeoutMs = 12_000
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No active session. Please sign in again.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      // Try to extract a useful message from the response body
      let detail = "";
      try {
        const errBody = await res.json();
        detail = errBody.error || errBody.message || "";
      } catch {
        /* response wasn't JSON — ignore */
      }
      throw new Error(
        detail || `Edge function "${functionName}" failed (HTTP ${res.status})`
      );
    }

    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json as T;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  }
}
