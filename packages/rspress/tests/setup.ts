import Babel from "@babel/standalone";
import { vi } from "vitest";

// Mock CSS modules
vi.mock("*.module.css", () => ({
	default: new Proxy(
		{},
		{
			get: (_target, prop) => prop,
		},
	),
}));

global.window = global.window || ({} as Window & typeof globalThis);

// In production, Babel is loaded from CDN as window.Babel (see htmlTags.ts).
// @babel/standalone gives tests the same shape so code under test doesn't
// need to know it's running in Node. window.rollup is wired per-test where
// it's needed (see bundleCode.test.ts), not globally here.
global.window.Babel = Babel;
