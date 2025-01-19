import { useDebouncedCallback } from "@mantine/hooks";
import { type ReactNode, createElement, useEffect, useState } from "react";
import { compileComponentFromFiles } from "./compiler";
import { Files } from "../../../../shared/types";

const DEBOUNCE_TIME = 500;

type CodeRunnerProps = {
	files: Files;
	setError: (error: Error | undefined) => void;
};

export const CodeRunner = ({ files, setError }: CodeRunnerProps) => {
	const [component, setComponent] = useState<ReactNode | null>(null);

	const getComponent = async (files: Files) => {
		try {
			const start = performance.now();
			const component = await compileComponentFromFiles(files);
			const end = performance.now();

			const diff = Math.round(end - start);
			console.info(
				`%cTranspiled in ${diff}ms`,
				"background: #15889f; padding: 6px; color: white;"
			);

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
