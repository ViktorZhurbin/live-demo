import type { EditorProps } from "~web/ui/Editor/Editor";
import type { FileTabsProps } from "~web/ui/FileTabs/FileTabs";
import type { ResizablePanelsProps } from "~web/ui/ResizablePanels/types";

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
		fileTabs?: Pick<FileTabsProps, "hideSingleTab"> & {
			hide?: boolean;
		};
		editor?: EditorProps;
		resizablePanels?: Pick<
			ResizablePanelsProps,
			"autoSaveId" | "defaultPanelSizes"
		>;
	};
};
