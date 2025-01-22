import { useDebouncedCallback } from "@mantine/hooks";
import type { Files } from "@shared/types";
import { type ReactElement, createElement, useEffect, useState } from "react";
import { bundleCode } from "./compiler/bundleCode";
import { getFnFromString } from "./compiler/getFnFromString";

const DEBOUNCE_TIME = 500;

export type CodeRunnerProps = {
	files: Files;
	entryFileName: string;
	setError: (error: Error | undefined) => void;
};

export const CodeRunner = ({
	files,
	setError,
	entryFileName,
}: CodeRunnerProps) => {
	const [prevCode, setPrevCode] = useState("");
	const [dynamicComponent, setDynamicComponent] = useState<ReactElement | null>(
		null,
	);

	const getComponent = async (files: Files) => {
		if (!(window.Babel || window.rollup)) return;

		try {
			const code = await bundleCode({ entryFileName, files });

			if (code === prevCode) return;

			const component = getFnFromString(code);

			if (component) {
				setError(undefined);
				setPrevCode(code);
				setDynamicComponent(createElement(component));
			}
		} catch (e) {
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
