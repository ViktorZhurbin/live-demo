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
 * (`LiveDemoLazy` → `LiveDemoRoot` → `LiveDemoProvider`), each of which just
 * adds its own concerns on top (e.g. `children`).
 */
export type LiveDemoWidgetProps = {
	isDark: boolean;
	pluginProps: LiveDemoStringifiedProps;
};

/**
 * `LiveDemoRoot`'s own props: `LiveDemoWidgetProps` plus the width
 * `LiveDemoLazy` measured off the loading skeleton right before swapping it
 * for the real widget. `ResizablePanels`/`ControlPanel` seed their first
 * render's width branch from this (via context) instead of the 0
 * `useElementSize` starts every ref at, which is what used to render the
 * narrow/stacked layout for one frame at every viewport width.
 */
export type LiveDemoRootProps = LiveDemoWidgetProps & {
	initialWidth: number | undefined;
};
