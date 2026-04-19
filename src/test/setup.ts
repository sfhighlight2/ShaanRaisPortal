import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

// ── MSW server lifecycle ─────────────────────────────────
// Start the MSW intercept layer before any tests run.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
// Reset any per-test handler overrides so tests are independent.
afterEach(() => server.resetHandlers());
// Tear down after all tests in the file finish.
afterAll(() => server.close());

// ── Browser API stubs ────────────────────────────────────
// jsdom doesn't implement matchMedia; stub it so Radix/Tailwind components don't throw.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// ResizeObserver is used by Radix Scroll Area and similar components.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver is used by some Radix primitives.
global.IntersectionObserver = class {
  root = null;
  rootMargin = "";
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
