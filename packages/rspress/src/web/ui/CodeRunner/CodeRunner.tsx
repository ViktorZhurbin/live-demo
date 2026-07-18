import { useDebouncedCallback } from "@mantine/hooks";
import { createElement, type ReactElement, useEffect, useState } from "react";
import { LiveDemoError } from "~shared/errors";
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
		if (!window.Babel || !window.rollup) return;

		try {
			const code = await bundleCode({ entryFileName, files });

			if (code === prevCode && !error) return;

			const component = getFnFromString(code);

			if (typeof component === "function") {
				setError(undefined);
				setPrevCode(code);
				setDynamicComponent(createElement(component));
			} else {
				throw new LiveDemoError("NO_DEFAULT_EXPORT", { entryFileName });
			}
		} catch (e) {
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
