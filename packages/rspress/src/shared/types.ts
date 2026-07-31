import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";

import type { LiveDemoLanguage } from "./constants";

export type PathWithAllowedExt = `${string}.${LiveDemoLanguage}`;

/**
 * `Record<fileName, fileContentsString>`
 */
export type LiveDemoFiles = Record<string, string>;

/** External package names collected across all demos in the build, for `getVirtualModulesCode`. */
export type UniqueImports = Set<string>;

export type LiveDemoPropsFromPlugin = {
	files: LiveDemoFiles;
	entryFileName: string;
	/**
	 * External packages this demo imports, as collected at build time.
	 *
	 * A prefetch hint, not a contract: the runtime uses it to start loading
	 * the demo's externals at mount, in parallel with the compiler, instead of
	 * discovering them only after bundling (see `CodeRunner`). `runCode`
	 * still resolves whatever the bundle actually imports, so an edit that adds
	 * an import is handled without this list.
	 *
	 * Absent for inline demos: their source is parsed for imports too
	 * (`collectInlineImports.ts`, via `visitFilePaths.ts`), and those imports
	 * do reach the virtual module — only this prop isn't populated for them.
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
	/** Props passed from plugin to LiveDemo components. */
	ui?: {
		controlPanel?: {
			hide?: boolean;
		};
		fileTabs?: FileTabsOptions & {
			hide?: boolean;
		};
		/**
		 * Spread onto the plugin's own CodeMirror instance *after* its
		 * defaults, so a key here replaces the plugin's value for that key
		 * rather than merging into it — see docs/guide/customization for which
		 * keys that affects.
		 */
		editor?: ReactCodeMirrorProps;
		resizablePanels?: ResizablePanelsOptions;
	};
};
