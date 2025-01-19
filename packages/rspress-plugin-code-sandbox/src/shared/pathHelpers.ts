import { Language } from "./constants";

/** starting with ./ or ../  */
const relativeImportRegex = /^\.{1,2}\//;

export const isRelativeImport = (importPath: string) =>
	relativeImportRegex.test(importPath);

export const stripRelativeImport = (importPath: string) =>
	importPath.replace(/[./]+/, "");

export const getPossiblePaths = (filePath: string) => {
	const fileExt = filePath.split(".")[1];
	const isAllowedLanguage = fileExt in Language;

	const possiblePaths = isAllowedLanguage
		? [filePath]
		: Object.keys(Language).map((ext) => `${filePath}.${ext}`);

	return possiblePaths;
};
