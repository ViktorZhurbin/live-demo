import { useCallback } from "react";
import { usePlaygroundContext } from "web/context";

export const useActiveCode = () => {
	const { files, activeFile, updateFiles } = usePlaygroundContext();

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
