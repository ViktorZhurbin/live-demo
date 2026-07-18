import { useElementSize, useMounted } from "@mantine/hooks";
import clsx from "clsx";
import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
} from "react-resizable-panels";
import { PanelsView } from "~web/constants/settings";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { useLocalStorageView } from "~web/hooks/useLocalStorage";
import { Editor } from "~web/ui/Editor/Editor";
import { FileTabs } from "~web/ui/FileTabs/FileTabs";
import { Preview } from "~web/ui/Preview/Preview";

import type { ResizablePanelsProps } from "./types";

import styles from "./ResizablePanels.module.css";

// `useDefaultLayout`'s `storage` param defaults to the `localStorage` global
// whenever we pass `undefined` (JS default-parameter semantics), so an
// explicit no-op is required to opt out -- both to avoid a `ReferenceError`
// during SSR (no `localStorage` global in Node) and to actually skip
// persistence when no `autoSaveId` is given.
const noopStorage: Pick<Storage, "getItem" | "setItem"> = {
	getItem: () => null,
	setItem: () => {},
};

export const ResizablePanels = (props: ResizablePanelsProps) => {
	const { options } = useLiveDemoContext();
	const mergedOptions = Object.assign(options?.resizablePanels ?? {}, props);

	const {
		classes,
		autoSaveId,
		verticalThreshold = 550,
		defaultPanelSizes = { editor: "50%", preview: "50%" },
	} = mergedOptions;

	const [panelsView] = useLocalStorageView();

	// `useDefaultLayout` reads storage via `useSyncExternalStore`, so
	// switching storage based on a raw `typeof localStorage` check would make
	// the client's very first (hydration) render disagree with what the
	// server actually rendered -- the exact mismatch the library's docs warn
	// against. `useMounted` starts `false` on both server and the client's
	// first render, only flipping `true` in a later, client-only render, so
	// server and hydration agree (`noopStorage`) and the swap to real
	// `localStorage` happens safely afterward.
	const mounted = useMounted();
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: autoSaveId ?? "live-demo-resizable-panels",
		storage: autoSaveId && mounted ? localStorage : noopStorage,
	});

	const wrapperSize = useElementSize();
	const isVertical = wrapperSize.width < verticalThreshold;

	const wrapperClass = clsx(styles.wrapper, classes?.wrapper, {
		[styles.vertical]: isVertical,
	});

	const editorClasses = clsx(styles.editorPanel, classes?.editorPanel, {
		[styles.hiddenPanel]: panelsView === PanelsView.Preview,
	});

	const previewClasses = clsx(classes?.previewPanel, {
		[styles.hiddenPanel]: panelsView === PanelsView.Editor,
	});

	const editorPanel = (
		<Panel
			key="editor"
			id="editor"
			className={editorClasses}
			defaultSize={defaultPanelSizes.editor}
			onKeyDown={(e) => {
				// to avoid interfering with global event listeners
				e.stopPropagation();
			}}
		>
			{props.editor ?? (
				<>
					<FileTabs />
					<Editor />
				</>
			)}
		</Panel>
	);

	const previewPanel = (
		<Panel
			key="preview"
			id="preview"
			className={previewClasses}
			defaultSize={defaultPanelSizes.preview}
		>
			{props.preview ?? <Preview />}
		</Panel>
	);

	return (
		<div className={wrapperClass} ref={wrapperSize.ref}>
			<Group
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
				style={{ flexDirection: isVertical ? "column" : "row" }}
				orientation={isVertical ? "vertical" : "horizontal"}
			>
				{isVertical ? previewPanel : editorPanel}
				<Separator className={styles.resizeHandle} />
				{isVertical ? editorPanel : previewPanel}
			</Group>
		</div>
	);
};
