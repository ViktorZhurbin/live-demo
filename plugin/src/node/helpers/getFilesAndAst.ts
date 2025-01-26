import fs from "node:fs";
import type { Program } from "@babel/types";
import { parseSync } from "@oxidation-compiler/napi";
import type { Files, PathWithAllowedExt } from "shared/types";

type GetFilesAndAst = {
	fileName: string;
	absolutePath: PathWithAllowedExt;
};

export const getFilesAndAst = (
	params: GetFilesAndAst,
): { files: Files; ast: Program } => {
	const { absolutePath, fileName } = params;

	const files: Files = {};

	const code = fs.readFileSync(absolutePath, { encoding: "utf8" });

	files[fileName] = code;

	const parsed = parseSync(code, {
		sourceType: "module",
		sourceFilename: fileName,
	});

	const ast = JSON.parse(parsed.program) as Program;

	return { files, ast };
};
