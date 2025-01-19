import path from "node:path";
import { Language } from "../../shared/constants";
import { getPathWithExt } from "../../shared/pathHelpers";
import { getFiles } from "./getFiles";

export const getFilesAndImports = (params: {
	importPath: string;
	dirname: string;
}) => {
	const { importPath, dirname } = params;

	const resolvedPath = path.join(
		dirname,
		getPathWithExt(importPath, Language.tsx)
	);

	const { files, astBody } = getFiles({ resolvedPath, importPath });

	const imports: Record<string, string> = {};

	// Could this be done through Babel plugins in transformTsxToJsx?
	for (const statement of astBody) {
		if (statement.type !== "ImportDeclaration") continue;

		const importPath = statement.source.value;

		// external modules will be resolved through _playground_virtual_modules
		imports[importPath] = importPath;
	}

	return { files, imports };
};
