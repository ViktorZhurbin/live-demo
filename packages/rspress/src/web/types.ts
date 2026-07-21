import type { LiveDemoPropsFromPlugin } from "~shared/types";

/**
 * Props passed from plugin to LiveDemo components are JSON.stringified.
 * Without stringification having code strings (in `props.files`)
 * tends to break MDX parsing. Parsed back via `context/parseProps.ts`.
 */
export type LiveDemoStringifiedProps = {
	[Key in keyof LiveDemoPropsFromPlugin]: string;
};

/**
 * Shape shared by every hop in the lazy-load chain
 * (`LiveDemoLazy` → `Core` → `LiveDemoProvider`), each of which just adds its
 * own concerns on top (e.g. `children`).
 */
export type LiveDemoWidgetProps = {
	isDark: boolean;
	pluginProps: LiveDemoStringifiedProps;
};
