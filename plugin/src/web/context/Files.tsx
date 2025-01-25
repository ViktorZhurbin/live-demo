import { createContext, useCallback, useContext, useState } from "react";
import type { Files, PlaygroundProps } from "shared/types";

type FilesContextValue = {
	files: Files;
	setFiles: React.Dispatch<React.SetStateAction<Files>>;

	activeFile: string;
	setActiveFile: React.Dispatch<React.SetStateAction<string>>;

	updateFiles: (update: Files) => void;

	entryFileName: PlaygroundProps["entryFileName"];
};

const FilesContext = createContext<FilesContextValue | undefined>(undefined);

type FilesProviderProps = {
	children: React.ReactNode;
	initialValue: PlaygroundProps;
};

function FilesProvider({ children, initialValue }: FilesProviderProps) {
	const [files, setFiles] = useState(initialValue.files);
	const [activeFile, setActiveFile] = useState(initialValue.entryFileName);

	const updateFiles = useCallback((update: Files) => {
		setFiles((prevFiles) => ({ ...prevFiles, ...update }));
	}, []);

	return (
		<FilesContext.Provider
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
		</FilesContext.Provider>
	);
}

const useFilesContext = () => {
	const context = useContext(FilesContext);

	if (context === undefined) {
		throw new Error("useFilesContext must be used within a FilesProvider");
	}

	return context;
};

export { FilesProvider, useFilesContext };
