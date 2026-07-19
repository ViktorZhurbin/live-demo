import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";

import type { LiveDemoLanguage } from "./constants";

export type PathWithAllowedExt = `${string}.${LiveDemoLanguage}`;

/**
 * `Record<fileName, fileContentsString>`
 */
export type LiveDemoFiles = Record<string, string>;

/**
 * Keyed by the entry file's resolved absolute path.
 */
export type DemoDataByPath = Record<string, LiveDemoPropsFromPlugin>;

/** External package names collected across all demos on a page, for `getVirtualModulesCode`. */
export type UniqueImports = Set<string>;

export type LiveDemoPropsFromPlugin = {
	files: LiveDemoFiles;
	entryFileName: string;
	options?: LiveDemoPluginOptions["ui"];
};

/** Panel-size options shared with `ResizablePanelsProps`; see that type for the rest of its props. */
export type ResizablePanelsOptions = {
	/** Used for auto saving the panel sizes in local storage */
	autoSaveId?: string;
	/** Default panel sizes. Percentage strings (e.g. `"50%"`) or pixel numbers. */
	defaultPanelSizes?: {
		/** @defaultValue `"50%"` */
		editor?: string | number;
		/** @defaultValue `"50%"` */
		preview?: string | number;
	};
};

/** Mirrors `FileTabsProps`; see that type for how it's consumed. */
export type FileTabsOptions = {
	/**
	 * Hide single file tab
	 * @defaultValue `false`
	 */
	hideSingleTab?: boolean;
};

export type LiveDemoPluginOptions = {
	/**
	 * Modules that will be available in demos,
	 * @example
	 * includeModules: ["@mantine/hooks"]
	 * Then you can use `import { ... } from "@mantine/hooks"` in any demo.
	 **/
	includeModules?: string[];

	/** Props passed from plugin to LiveDemo components. */
	ui?: {
		controlPanel?: {
			hide?: boolean;
		};
		fileTabs?: FileTabsOptions & {
			hide?: boolean;
		};
		editor?: ReactCodeMirrorProps;
		resizablePanels?: ResizablePanelsOptions;
	};
};
