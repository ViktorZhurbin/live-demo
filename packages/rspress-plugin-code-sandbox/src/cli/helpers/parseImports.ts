import type { Program } from "@oxc-project/types";
import { parseSync } from "@oxidation-compiler/napi";

export const parseImports = (code: string, sourceExt: string) => {
	const parsed = parseSync(code, {
		sourceType: "module",
		sourceFilename: `index.${sourceExt}`,
	});

	const ast = JSON.parse(parsed.program) as Program;

	const result = ast.body.reduce<Record<string, string>>((acc, statement) => {
		if (statement.type === "ImportDeclaration") {
			const importPath = statement.source.value;

			acc[importPath] = importPath;
		}

		return acc;
	}, {});

	return result;
};
