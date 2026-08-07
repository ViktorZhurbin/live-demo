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
	 * Omitted entirely when a demo imports nothing external, inline or not —
	 * an empty array would be one more JSON attribute in the page's HTML for
	 * no gain.
	 */
	externalImports?: string[];
	options?: LiveDemoPluginOptions["ui"];
};

export type ResizablePanelsOptions = {
	/** Used for auto saving the panel sizes in local storage */
	autoSaveId?: string;
	/**
	 * Default panel sizes. Percentage strings (e.g. `"50%"`) or pixel numbers.
	 * @defaultValue `{ editor: "50%", preview: "50%" }`
	 */
	defaultPanelSizes?: {
		/** If omitted, gets whatever space `preview` doesn't claim. */
		editor?: string | number;
		/** If omitted, gets whatever space `editor` doesn't claim. */
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

export type EditorOptions = {
	/** @defaultValue `2` */
	tabSize?: number;
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
		editor?: EditorOptions;
		resizablePanels?: ResizablePanelsOptions;
	};
};
