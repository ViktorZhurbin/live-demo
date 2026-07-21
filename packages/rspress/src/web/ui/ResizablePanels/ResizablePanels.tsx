import { useElementSize, useMounted } from "@mantine/hooks";
import clsx from "clsx";
import { useEffect } from "react";
import {
	Group,
	Panel,
	type PanelImperativeHandle,
	Separator,
	useDefaultLayout,
	usePanelRef,
} from "react-resizable-panels";
import { PanelsView } from "~web/constants/settings";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { useLocalStorageView } from "~web/hooks/useLocalStorage";
import { Editor } from "~web/ui/Editor/Editor";
import { FileTabs } from "~web/ui/FileTabs/FileTabs";
import { Preview } from "~web/ui/Preview/Preview";

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

// Wrapper width in px below which panels stack vertically instead of side by
// side. Mirrored by `lazyFallback.css`'s own 550px breakpoint, so the loading
// skeleton doesn't jump shape when `Core` mounts on a narrow screen — keep
// the two in sync.
const VERTICAL_THRESHOLD = 550;

export const ResizablePanels = () => {
	const { options } = useLiveDemoContext();

	const { autoSaveId, defaultPanelSizes = { editor: "50%", preview: "50%" } } =
		options?.resizablePanels ?? {};

	const [panelsView] = useLocalStorageView();
	const isSplitView = panelsView === PanelsView.Split;

	// Hiding a panel collapses it to zero size; it stays mounted. This is
	// intentional: unmounting would discard whatever state the demo component
	// holds and force a fresh (debounced) bundle every time the view toggles.
	//
	// It can't be done in CSS, which is what used to be attempted here: `Panel`
	// applies `className`/`style` to a *nested* div precisely so styles can't
	// interfere with its flex layout, so `display: none` hid a panel's contents
	// while its outer box kept its share of the row. The toggle looked dead.
	// Driving the library's own collapse API is the supported way to get both
	// properties at once.
	const editorPanelRef = usePanelRef();
	const previewPanelRef = usePanelRef();

	useEffect(() => {
		const setCollapsed = (
			panel: PanelImperativeHandle | null,
			collapsed: boolean,
		) => {
			if (!panel) return;

			if (collapsed) {
				panel.collapse();
			} else {
				panel.expand();
			}
		};

		setCollapsed(editorPanelRef.current, panelsView === PanelsView.Preview);
		setCollapsed(previewPanelRef.current, panelsView === PanelsView.Editor);
	}, [panelsView, editorPanelRef, previewPanelRef]);

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
	const isVertical = wrapperSize.width < VERTICAL_THRESHOLD;

	const wrapperClass = clsx(styles.wrapper, {
		[styles.vertical]: isVertical,
	});

	// These `id`s double as the e2e locators: react-resizable-panels assigns a
	// Panel's `id` to its rendered `data-testid` too (documented behavior), and
	// website/e2e/*.spec.ts select on `getByTestId("editor")`/`("preview")` and
	// `#editor`/`#preview`. Renaming either breaks those specs.
	const editorPanel = (
		<Panel
			key="editor"
			id="editor"
			panelRef={editorPanelRef}
			collapsible
			collapsedSize="0%"
			className={styles.editorPanel}
			defaultSize={defaultPanelSizes.editor}
			onKeyDown={(e) => {
				// to avoid interfering with global event listeners
				e.stopPropagation();
			}}
		>
			<FileTabs />
			<Editor />
		</Panel>
	);

	const previewPanel = (
		<Panel
			key="preview"
			id="preview"
			panelRef={previewPanelRef}
			collapsible
			collapsedSize="0%"
			defaultSize={defaultPanelSizes.preview}
		>
			<Preview />
		</Panel>
	);

	// Everything stays mounted when a panel is collapsed, so the separator has
	// to be hidden explicitly — it puts `className` on its own element (unlike
	// `Panel`) and only forces `flex-grow`/`flex-shrink`, so CSS works here.
	const separatorClasses = clsx(styles.resizeHandle, {
		[styles.hiddenSeparator]: !isSplitView,
	});

	return (
		<div className={wrapperClass} ref={wrapperSize.ref}>
			{/*
			 * Hiding the separator isn't enough to stop dragging: a `Panel`'s own
			 * edge is a resize hit target independent of the separator (see
			 * `resizeTargetMinimumSize`), so a collapsed panel could still be
			 * dragged back open from the edge, leaving the layout disagreeing
			 * with the view toggle. `disabled` turns off both hit targets.
			 */}
			<Group
				disabled={!isSplitView}
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
				style={{ flexDirection: isVertical ? "column" : "row" }}
				orientation={isVertical ? "vertical" : "horizontal"}
			>
				{isVertical ? previewPanel : editorPanel}
				<Separator className={separatorClasses} />
				{isVertical ? editorPanel : previewPanel}
			</Group>
		</div>
	);
};
