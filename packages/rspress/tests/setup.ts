import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock CSS modules
vi.mock("*.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, prop) => prop,
    },
  ),
}));

// Mock window.Babel for runtime tests (will be overridden in specific tests)
global.window = global.window || {};

// Mock window.rollup for runtime tests (will be overridden in specific tests)
// These are loaded from CDN in production
