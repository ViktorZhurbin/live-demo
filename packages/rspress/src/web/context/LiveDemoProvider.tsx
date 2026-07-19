import { useFullscreenElement } from "@mantine/hooks";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { LiveDemoError } from "~shared/errors";
import type { LiveDemoFiles, LiveDemoPropsFromPlugin } from "~shared/types";
import type { LiveDemoStringifiedProps } from "~web/types";

import { parseProps } from "./parseProps";

type LiveDemoContextValue = {
	files: LiveDemoFiles;
	setFiles: React.Dispatch<React.SetStateAction<LiveDemoFiles>>;

	activeFile: string;
	setActiveFile: React.Dispatch<React.SetStateAction<string>>;

	updateFiles: (update: LiveDemoFiles) => void;

	isDark: boolean;
	fullscreen: ReturnType<typeof useFullscreenElement>;
	options: LiveDemoPropsFromPlugin["options"];
	entryFileName: LiveDemoPropsFromPlugin["entryFileName"];
};

const LiveDemoContext = createContext<LiveDemoContextValue | undefined>(
	undefined,
);

type LiveDemoProviderProps = {
	isDark: boolean;
	children: React.ReactNode;
	pluginProps: LiveDemoStringifiedProps;
};

function LiveDemoProvider({
	isDark,
	children,
	pluginProps: rawPluginProps,
}: LiveDemoProviderProps) {
	const fullscreen = useFullscreenElement();

	// Memoized because this JSON.parses every file's full source: unmemoized it
	// re-parsed the whole demo on every keystroke (each `setFiles` re-renders
	// this provider), and only `options`/`entryFileName` are read after mount —
	// `files` is used once, as the initial state below.
	//
	// It also gives `options` a stable identity, which consumers now rely on:
	// they merge it into their own props, and must not mutate it.
	const pluginProps = useMemo(
		() => parseProps(rawPluginProps),
		[rawPluginProps],
	);

	const [files, setFiles] = useState(pluginProps.files);
	const [activeFile, setActiveFile] = useState(pluginProps.entryFileName);

	const updateFiles = useCallback((update: LiveDemoFiles) => {
		setFiles((prevFiles) => ({ ...prevFiles, ...update }));
	}, []);

	return (
		<LiveDemoContext
			value={{
				files,
				setFiles,
				updateFiles,

				activeFile,
				setActiveFile,

				fullscreen,
				isDark,

				options: pluginProps.options,
				entryFileName: pluginProps.entryFileName,
			}}
		>
			{children}
		</LiveDemoContext>
	);
}

const useLiveDemoContext = () => {
	const context = useContext(LiveDemoContext);

	if (context === undefined) {
		throw new LiveDemoError("PROVIDER_MISSING");
	}

	return context;
};

export { LiveDemoProvider, useLiveDemoContext };
