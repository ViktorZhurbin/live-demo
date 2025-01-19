import { createContext, useCallback, useContext, useState } from "react";
import type { Files, PlaygroundProps } from "../../shared/types";

type FilesContextValue = {
	files: Files;
	setFiles: React.Dispatch<React.SetStateAction<Files>>;

	updateFiles: (update: Files) => void;

	dependencies: PlaygroundProps["dependencies"];
};

const FilesContext = createContext<FilesContextValue | undefined>(undefined);

type FilesProviderProps = {
	children: React.ReactNode;
	initialValue: PlaygroundProps;
};

function FilesProvider({ initialValue, children }: FilesProviderProps) {
	const [files, setFiles] = useState(initialValue.files);

	const updateFiles = useCallback((update: Files) => {
		setFiles((prevFiles) => ({ ...prevFiles, ...update }));
	}, []);

	return (
		<FilesContext.Provider
			value={{
				files,
				setFiles,
				updateFiles,

				dependencies: initialValue.dependencies,
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
