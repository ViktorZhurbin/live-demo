import { createContext, useCallback, useContext, useState } from "react";
import type { Files, PlaygroundProps } from "shared/types";

type PlaygroundContextValue = {
	files: Files;
	setFiles: React.Dispatch<React.SetStateAction<Files>>;

	activeFile: string;
	setActiveFile: React.Dispatch<React.SetStateAction<string>>;

	updateFiles: (update: Files) => void;

	entryFileName: PlaygroundProps["entryFileName"];
};

const PlaygroundContext = createContext<PlaygroundContextValue | undefined>(
	undefined,
);

type PlaygroundProviderProps = {
	children: React.ReactNode;
	initialValue: PlaygroundProps;
};

function PlaygroundProvider({
	children,
	initialValue,
}: PlaygroundProviderProps) {
	const [files, setFiles] = useState(initialValue.files);
	const [activeFile, setActiveFile] = useState(initialValue.entryFileName);

	const updateFiles = useCallback((update: Files) => {
		setFiles((prevFiles) => ({ ...prevFiles, ...update }));
	}, []);

	return (
		<PlaygroundContext.Provider
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
		</PlaygroundContext.Provider>
	);
}

const usePlaygroundContext = () => {
	const context = useContext(PlaygroundContext);

	if (context === undefined) {
		throw new Error(
			"usePlaygroundContext must be used within a PlaygroundContext",
		);
	}

	return context;
};

export { PlaygroundProvider, usePlaygroundContext };
