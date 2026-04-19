/**
 * MSW handlers for Supabase Edge Functions (called via edgeFetch).
 * Default: all edge functions return success.
 * Override per-test for failure scenarios.
 */
import { http, HttpResponse } from "msw";

const SB_FN = "http://localhost:54321/functions/v1";

export const edgeFunctionHandlers = [
  /** assign-package: default success */
  http.post(`${SB_FN}/assign-package`, () =>
    HttpResponse.json({ success: true, message: "Package assigned." })
  ),

  /** send-update: default success */
  http.post(`${SB_FN}/send-update`, () =>
    HttpResponse.json({ success: true })
  ),

  /** invite-user: default success */
  http.post(`${SB_FN}/invite-user`, () =>
    HttpResponse.json({ success: true })
  ),
];
