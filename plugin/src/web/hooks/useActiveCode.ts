import { useCallback } from "react";
import { useFilesContext } from "web/context";

export const useActiveCode = () => {
	const { files, activeFile, updateFiles } = useFilesContext();

	const code = files[activeFile] ?? "";

	const updateCode = useCallback(
		(code: string) => {
			updateFiles({ [activeFile]: code });
		},
		[activeFile, updateFiles],
	);

	return {
		code,
		updateCode,
	};
};
