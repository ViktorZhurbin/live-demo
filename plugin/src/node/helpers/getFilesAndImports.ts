import fs from "node:fs";
import path from "node:path";
import type { Program } from "@oxc-project/types";
import { parseSync } from "@oxidation-compiler/napi";
import { getPossiblePaths, isRelativeImport } from "@shared/pathHelpers";
import type { Files } from "@shared/types";

export const getFilesAndImports = (params: {
	importPath: string;
	dirname: string;
}) => {
	const { importPath, dirname } = params;

	const resolvedPath = resolveFilePath({ importPath, dirname });
	const entryFileName = path.basename(resolvedPath);
	const code = fs.readFileSync(resolvedPath, { encoding: "utf8" });

	const files: Files = {
		[entryFileName]: code,
	};

	const parsed = parseSync(code, {
		sourceType: "module",
		sourceFilename: entryFileName,
	});

	const ast = JSON.parse(parsed.program) as Program;

	const imports = new Set<string>();

	for (const statement of ast.body) {
		if (statement.type !== "ImportDeclaration") continue;

		const importPath = statement.source.value;

		if (isRelativeImport(importPath)) {
			// Make relative imports available in the code editor
			const nested = getFilesAndImports({
				importPath,
				dirname: path.dirname(resolvedPath),
			});

			files[nested.entryFileName] = nested.files[nested.entryFileName];
		} else {
			imports.add(importPath);
		}
	}

	return { files, imports, entryFileName };
};

function resolveFilePath({
	dirname,
	importPath,
}: { importPath: string; dirname: string }) {
	const absolutePath = path.join(dirname, importPath);

	// same helper should be used in `getRollupBundledCode`
	const pathsToCheck = getPossiblePaths(absolutePath);

	for (const checkedPath of pathsToCheck) {
		if (fs.existsSync(checkedPath)) {
			return checkedPath;
		}
	}

	throw new Error(
		`Couldn't resolve src import path: ${importPath}. Only .jsx and .tsx files are supported`,
	);
}
