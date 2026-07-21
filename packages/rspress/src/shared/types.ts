import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";

import type { LiveDemoLanguage } from "./constants";

export type PathWithAllowedExt = `${string}.${LiveDemoLanguage}`;

/**
 * `Record<fileName, fileContentsString>`
 */
export type LiveDemoFiles = Record<string, string>;

/**
 * Collected demo data, keyed by each `<code src>`'s raw reference — see
 * `demoRefKey`. The scan phase writes it; the remark transform reads it back.
 */
export type DemoDataByRef = Record<string, LiveDemoPropsFromPlugin>;

/** External package names collected across all demos on a page, for `getVirtualModulesCode`. */
export type UniqueImports = Set<string>;

export type LiveDemoPropsFromPlugin = {
	files: LiveDemoFiles;
	entryFileName: string;
	/**
	 * External packages this demo imports, as collected at build time.
	 *
	 * A prefetch hint, not a contract: the runtime uses it to start loading
	 * the demo's externals at mount, in parallel with the compiler, instead of
	 * discovering them only after bundling (see `CodeRunner`). `bundleCode`
	 * still resolves whatever the bundle actually imports, so an edit that adds
	 * an import is handled without this list.
	 *
	 * Absent for inline demos — their source is never parsed, so their imports
	 * aren't known at build time (see `remarkPlugin`'s Transform 2).
	 */
	externalImports?: string[];
	options?: LiveDemoPluginOptions["ui"];
};

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
