/**
 * MSW handlers for Supabase Auth endpoints.
 * These intercept GoTrue API calls so unit/integration tests never hit the real DB.
 */
import { http, HttpResponse } from "msw";

const SUPABASE_URL = "http://localhost:54321"; // local dev default; overridden by env in CI

export const authHandlers = [
  /** Successful sign-in */
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
      user: {
        id: "user-admin-001",
        email: "admin@example.com",
        role: "authenticated",
      },
    });
  }),

  /** getSession — returns a live admin session by default */
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: "user-admin-001",
      email: "admin@example.com",
      role: "authenticated",
    });
  }),

  /** Sign-out */
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
