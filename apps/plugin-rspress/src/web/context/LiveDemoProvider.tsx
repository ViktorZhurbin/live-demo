import { createContext, useCallback, useContext, useState } from "react";
import type { LiveDemoFiles, LiveDemoProps } from "shared/types";

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
	initialValue: LiveDemoProps;
};

function LiveDemoProvider({ children, initialValue }: LiveDemoProviderProps) {
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
			{children}
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
