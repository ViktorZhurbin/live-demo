import { useCallback } from "react";
import { useLiveDemoContext } from "web/context";

export const useActiveCode = () => {
	const { files, activeFile, updateFiles } = useLiveDemoContext();

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
