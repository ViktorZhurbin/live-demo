import "@live-demo/rspress/web/index.css";
import { LiveDemoLazy } from "@live-demo/rspress/web/lazy";
import { useDark } from "@rspress/core/runtime";

// @ts-expect-error: resourceQuery is set up in rspack configuration
import importedCode from "../docs/guide/external/snippets/multiFile/Imported.tsx?raw"; // oxlint-disable-line import/default -- ?raw suffix returns a string, no default export to resolve
// @ts-expect-error
import multiFileCode from "../docs/guide/external/snippets/multiFile/MultiFile.tsx?raw"; // oxlint-disable-line import/default -- ?raw suffix returns a string, no default export to resolve

/**
 * Hand-rolled demo on the docs homepage — outside the plugin's scan/remark
 * system, so it has to opt into the async boundary itself. `theme/index.tsx`
 * imports this synchronously for every route, so importing `Core` directly
 * here would tax every page of the site (AUDIT.md F1).
 */
export const HomeDemo = () => {
	const isDark = useDark();

	return (
		<LiveDemoLazy
			isDark={isDark}
			pluginProps={{
				files: JSON.stringify({
					"MultiFile.tsx": multiFileCode,
					"Imported.tsx": importedCode,
				}),
				entryFileName: JSON.stringify("MultiFile.tsx"),
				options: JSON.stringify({
					resizablePanels: {
						defaultPanelSizes: { editor: "70%", preview: "40%" },
					},
				}),
			}}
		/>
	);
};
