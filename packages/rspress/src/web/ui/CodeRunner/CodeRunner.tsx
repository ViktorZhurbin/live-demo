import { useDebouncedCallback } from "@mantine/hooks";
import {
	createElement,
	type ReactElement,
	useEffect,
	useRef,
	useState,
} from "react";
import type { LiveDemoFiles } from "~shared/types";
import { bundleCode } from "~web/compiler/bundleCode";
import { getFnFromString } from "~web/compiler/getFnFromString";
import { prefetchImports } from "~web/compiler/prefetchImports";
import { PreviewSkeleton } from "~web/PreviewSkeleton";

const DEBOUNCE_TIME = 800;

export type CodeRunnerProps = {
	files: LiveDemoFiles;
	entryFileName: string;
	/** Build-time list, used only to start loading this demo's externals early. */
	externalImports: string[] | undefined;

	error: Error | undefined;
	setError: (error: Error | undefined) => void;
};

/**
 * Bundles and evaluates the demo's `files` whenever they change, debounced so
 * every keystroke doesn't trigger a fresh Babel+Rollup pass. Bundle/eval
 * errors are caught here and handed to `setError` for `Preview`'s overlay —
 * `dynamicComponent` is left untouched on error, so the last successful
 * render stays mounted (dimmed) under the overlay instead of blanking.
 * Errors thrown during the demo component's own render are not caught here —
 * they propagate up to `Preview`'s `ErrorBoundary` instead.
 *
 * Two things happen on mount to keep first paint off a serial chain. The
 * demo's externals start downloading immediately, rather than after bundling
 * reveals them (`prefetchImports`), so they overlap the compiler's own load;
 * and the first compile skips the debounce, which otherwise spent 800ms idle
 * before even asking for Babel. Both only affect *when* work starts —
 * `bundleCode` still resolves whatever the bundle really imports.
 */
export const CodeRunner = ({
	files,
	error,
	setError,
	entryFileName,
	externalImports,
}: CodeRunnerProps) => {
	const [prevCode, setPrevCode] = useState("");
	const [dynamicComponent, setDynamicComponent] = useState<ReactElement | null>(
		null,
	);

	const getComponent = async (files: LiveDemoFiles) => {
		try {
			// bundleCode lazily loads Babel+Rollup; a load failure throws here
			// and is caught below, surfacing in the overlay rather than blanking.
			const code = await bundleCode({ entryFileName, files });

			if (code === prevCode && !error) return;

			// Throws NO_DEFAULT_EXPORT itself if the bundle exported nothing, so
			// there's no shape to re-check here — and checking for a function
			// would reject the memo()/forwardRef() objects it deliberately allows.
			const component = getFnFromString(code, entryFileName);

			setError(undefined);
			setPrevCode(code);
			setDynamicComponent(createElement(component));
		} catch (e) {
			// The overlay only shows the message; keep the stack reachable for
			// whoever is actually debugging the demo.
			console.error(e);
			setError(e as Error);
		}
	};

	const getComponentDebounced = useDebouncedCallback(
		getComponent,
		DEBOUNCE_TIME,
	);

	// Fire-and-forget: this is a head start, not the resolution path. A failure
	// here is left to surface from `bundleCode`'s own await, which reports it
	// against the import the demo actually asked for.
	useEffect(() => {
		prefetchImports(externalImports);
	}, [externalImports]);

	const hasCompiled = useRef(false);

	useEffect(() => {
		getComponentDebounced(files);

		// Nothing is on screen yet, so there's no keystroke burst to collapse and
		// nothing to gain from waiting out the debounce.
		if (!hasCompiled.current) {
			hasCompiled.current = true;
			getComponentDebounced.flush();
		}
	}, [getComponentDebounced, files]);

	// Distinguishes "not compiled yet" from "compiled to a component that
	// renders nothing": `dynamicComponent` holds the element, so it is non-null
	// after any successful compile. On a *failed* first compile `Preview` shows
	// the error overlay, which shouldn't sit on top of a loading skeleton.
	if (!dynamicComponent && !error) {
		return <PreviewSkeleton />;
	}

	return dynamicComponent;
};
