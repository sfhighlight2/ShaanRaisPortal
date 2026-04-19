/**
 * Central MSW handler registry.
 * Import and compose from individual handler files.
 * This is the single source of truth for all mocked APIs in unit/integration tests.
 */
import { authHandlers } from "./authHandlers";
import { clientHandlers } from "./clientHandlers";
import { edgeFunctionHandlers } from "./edgeFunctionHandlers";

export const handlers = [...authHandlers, ...clientHandlers, ...edgeFunctionHandlers];
