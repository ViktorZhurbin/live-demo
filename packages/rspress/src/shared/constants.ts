/**
 * Supported source extensions.
 *
 * Declaration order is resolution order: an extensionless import like
 * `./Button` is tried as `.tsx`, `.ts`, `.jsx`, `.js` in turn (see
 * `getPossiblePaths`). Components are the common case in a demo, so the
 * JSX-capable extension of each language comes first, and TypeScript comes
 * before JavaScript — the same order Next.js and most TS setups resolve with.
 */
export enum LiveDemoLanguage {
	tsx = "tsx",
	ts = "ts",
	jsx = "jsx",
	js = "js",
}
