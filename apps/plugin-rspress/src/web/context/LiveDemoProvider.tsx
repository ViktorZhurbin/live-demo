import { createContext, useCallback, useContext, useState } from "react";
import type {
	LiveDemoFiles,
	LiveDemoProps,
	LiveDemoStringifiedProps,
} from "shared/types";
import { parseProps } from "./parseProps";

type LiveDemoContextValue = {
	files: LiveDemoFiles;
	setFiles: React.Dispatch<React.SetStateAction<LiveDemoFiles>>;

	activeFile: string;
	setActiveFile: React.Dispatch<React.SetStateAction<string>>;

	updateFiles: (update: LiveDemoFiles) => void;

	entryFileName: LiveDemoProps["entryFileName"];
};

const LiveDemoContext = createContext<LiveDemoContextValue | undefined>(
	undefined,
);

type LiveDemoProviderProps = {
	children: React.ReactNode;
	initialValue: LiveDemoStringifiedProps;
};

function LiveDemoProvider(props: LiveDemoProviderProps) {
	const initialValue = parseProps(props.initialValue);

	const [files, setFiles] = useState(initialValue.files);
	const [activeFile, setActiveFile] = useState(initialValue.entryFileName);

	const updateFiles = useCallback((update: LiveDemoFiles) => {
		setFiles((prevFiles) => ({ ...prevFiles, ...update }));
	}, []);

	return (
		<LiveDemoContext.Provider
			value={{
				files,
				setFiles,
				updateFiles,

				activeFile,
				setActiveFile,

				entryFileName: initialValue.entryFileName,
			}}
		>
			{props.children}
		</LiveDemoContext.Provider>
	);
}

const useLiveDemoContext = () => {
	const context = useContext(LiveDemoContext);

	if (context === undefined) {
		throw new Error(
			"useLiveDemoContext must be used within a LiveDemoProvider",
		);
	}

	return context;
};

export { LiveDemoProvider, useLiveDemoContext };
