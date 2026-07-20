import { useDebouncedCallback } from "@mantine/hooks";
import { createElement, type ReactElement, useEffect, useState } from "react";
import type { LiveDemoFiles } from "~shared/types";
import { bundleCode } from "~web/compiler/bundleCode";
import { getFnFromString } from "~web/compiler/getFnFromString";

const DEBOUNCE_TIME = 800;

export type CodeRunnerProps = {
	files: LiveDemoFiles;
	entryFileName: string;

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
 */
export const CodeRunner = ({
	files,
	error,
	setError,
	entryFileName,
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

	useEffect(() => {
		getComponentDebounced(files);
	}, [getComponentDebounced, files]);

	return dynamicComponent;
};
