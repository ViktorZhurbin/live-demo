import { Language } from "./constants";
import type { PathWithAllowedExt } from "./types";

/** starting with ./ or ../  */
const relativeImportRegex = /^\.{1,2}\//;

export const isRelativeImport = (importPath: string) =>
	relativeImportRegex.test(importPath);

export const stripRelativeImport = (importPath: string) =>
	importPath.replace(/[./]+/, "");

export const getFileExt = (filename: string) => filename.split(".")[1];

export const getPossiblePaths = (filePath: string): PathWithAllowedExt[] => {
	const fileExt = getFileExt(filePath);

	if (fileExt in Language) {
		return [filePath] as PathWithAllowedExt[];
	}

	if (!fileExt) {
		return Object.keys(Language).map(
			(ext) => `${filePath}.${ext}` as PathWithAllowedExt,
		);
	}

	throw new Error(
		`Couldn't resolve \`${filePath}\`.\nOnly .jsx and .tsx files are supported`,
	);
};
