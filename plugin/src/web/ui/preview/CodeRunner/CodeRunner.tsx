import { useDebouncedCallback } from "@mantine/hooks";
import type { Files } from "@shared/types";
import { type ReactNode, createElement, useEffect, useState } from "react";
import { bundleCode } from "./compiler/bundleCode";
import { getComponentFnFromCodeString } from "./compiler/getFnFromFunctionString";

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
	const [component, setComponent] = useState<ReactNode | null>(null);

	const getComponent = async (files: Files) => {
		if (!(window.Babel || window.rollup)) return;

		try {
			const bundledCode = await bundleCode({
				entryFileName,
				files,
			});

			const component = getComponentFnFromCodeString(bundledCode);

			if (component) {
				setError(undefined);
				setComponent(createElement(component));
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

	return component;
};
