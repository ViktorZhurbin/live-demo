import Babel from "@babel/standalone";
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

global.window = global.window || {};

// In production, Babel is loaded from CDN as window.Babel (see htmlTags.ts).
// @babel/standalone gives tests the same shape so code under test doesn't
// need to know it's running in Node.
global.window.Babel = Babel;
