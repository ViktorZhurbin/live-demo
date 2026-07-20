import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	// Shared runners have limited, variable CPU -- Playwright's CI guidance is
	// to trade parallelism for reproducibility there rather than risk
	// resource-contention flakiness. Locally, default to the CPU-based count.
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "github" : "html",

	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "retain-on-failure",
	},

	// Bumped past the default 5s: first interaction on a demo page pays for the
	// lazy Babel+Rollup chunk load (see loadCompiler.ts) plus the 800ms
	// recompile debounce (CodeRunner.tsx), on top of normal CI slowness.
	expect: { timeout: 10_000 },

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	// Runs against the real build, not `dev`, so a passing suite reflects what
	// actually ships: the real remark transform, virtual-modules chunking, and
	// production bundle -- not the dev server's on-the-fly compilation.
	webServer: {
		command: "pnpm preview",
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
	},
});
