/**
 * MSW Node server singleton used in Vitest tests.
 * Exported so tests can call server.use(...) for per-test overrides.
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
