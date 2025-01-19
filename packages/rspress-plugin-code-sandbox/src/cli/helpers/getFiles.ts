import fs from "node:fs";
import { EntryFiles } from "../../shared/constants";
import type { Files } from "../../shared/types";
import { transformTsxToJsx } from "./transformTsxToJsx";
import { type Program } from "@babel/types";

type GetFiles = {
	resolvedPath: string;
	importPath: string;
};

/**
 * Create files object for Sandpack
 */
export const getFiles = (
	params: GetFiles
): { files: Files; astBody: Program["body"] } => {
	const { resolvedPath, importPath } = params;

	const files: Files = {};

	let tsxCode = "";
	try {
		tsxCode = fs.readFileSync(resolvedPath, {
			encoding: "utf8",
		});
	} catch {
		throw new Error(`Could not find file at "${resolvedPath}".
      Make sure you have a file named "${importPath}.tsx"`);
	}

	const tsxToJsxResult = transformTsxToJsx(tsxCode);
	const astBody = tsxToJsxResult?.ast?.program.body ?? [];

	files[EntryFiles.tsx] = tsxCode;

	return { files, astBody };
};
