import { useDebouncedCallback } from "@mantine/hooks";
import { type ReactNode, createElement, useEffect, useState } from "react";
import type { Files } from "@shared/types";
import { compileComponentFromFiles } from "./compiler";

const DEBOUNCE_TIME = 500;

type CodeRunnerProps = {
	files: Files;
	setError: (error: Error | undefined) => void;
};

export const CodeRunner = ({ files, setError }: CodeRunnerProps) => {
	const [component, setComponent] = useState<ReactNode | null>(null);

	const getComponent = async (files: Files) => {
		try {
			const component = await compileComponentFromFiles(files);

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
		DEBOUNCE_TIME
	);

	useEffect(() => {
		getComponentDebounced(files);
	}, [getComponentDebounced, files]);

	return component;
};
