import type { Node, PluginItem } from "@babel/core";
import type { VariableDeclaration } from "@babel/types";

import { EXPORTS_OBJ, GET_IMPORT_FN } from "../constants";

/**
 * Rewrite every import into a `__get_import` call resolved by the virtual
 * module, and normalise exports to `exports.default`.
 *
 * This runs over the *bundled* output, so the only imports left are external
 * packages — including `react/jsx-runtime`, which Babel's automatic JSX
 * runtime emits on the demo author's behalf.
 *
 * Note there is deliberately no auto-injected `React` binding. Under the
 * classic JSX runtime one was unshifted into every demo, because JSX compiled
 * to `React.createElement` and needed the identifier in scope. The automatic
 * runtime removes that need, and injecting an invisible binding made demos
 * non-portable: code that ran here would break the moment a reader pasted it
 * into their own app without importing React.
 */
export const babelPluginTraverse = (): PluginItem => {
	return {
		visitor: {
			ImportDeclaration(path) {
				const pkg = path.node.source.value;

				const code: Node[] = [];
				const namedImports: string[] = [];

				for (const specifier of path.node.specifiers) {
					// import X from 'foo' || import * as X from 'foo'
					if (
						specifier.type === "ImportDefaultSpecifier" ||
						specifier.type === "ImportNamespaceSpecifier"
					) {
						const isDefault = specifier.type === "ImportDefaultSpecifier";

						const node = createGetImportDeclaration({
							pkg,
							isDefault,
							imported: specifier.local.name,
						});

						code.push(node);
					}

					// import { a, b, importedName as localName } from 'pkg'
					if (specifier.type === "ImportSpecifier") {
						if (
							"name" in specifier.imported &&
							specifier.imported.name !== specifier.local.name
						) {
							// import { importedName as localName } from 'pkg'
							// Stored internally as "importedName: localName" for destructuring
							namedImports.push(
								`${specifier.imported.name}: ${specifier.local.name}`,
							);
						} else {
							// import { localName } from 'pkg'
							namedImports.push(specifier.local.name);
						}
					}
				}

				if (namedImports.length > 0) {
					const imported = `{ ${namedImports.join(", ")} }`;
					const importNode = createGetImportDeclaration({ pkg, imported });
					code.push(importNode);

					// Add validation for each named import
					const importNames = namedImports.map((importString) => {
						// Extract local name from internal format: "importedName: localName" -> "localName"
						const parts = importString.split(":").map((part) => part.trim());

						return parts.at(-1);
					});

					for (const importName of importNames) {
						const validationNode = createImportValidationError({
							pkg,
							importName,
						});
						code.push(validationNode);
					}
				}

				path.replaceWithMultiple(code);
			},

			ExportSpecifier(path) {
				path.parentPath.replaceWithSourceString(
					`${EXPORTS_OBJ} = ${path.node.local.name}`,
				);
			},
		},
	};
};

function getParsedVariableDeclaration(code: string) {
	const parsed = window.Babel?.packages.parser.parse(code);

	return parsed.program.body[0] as VariableDeclaration;
}

function createGetImportDeclaration({
	pkg,
	imported,
	isDefault = false,
}: {
	imported: string;
	pkg: string;
	isDefault?: boolean;
}) {
	const getImport = `${GET_IMPORT_FN}('${pkg}', ${isDefault})`;

	const importString = `const ${imported} = ${getImport}`;

	return getParsedVariableDeclaration(importString);
}

function createImportValidationError({
	importName,
	pkg,
}: {
	importName?: string;
	pkg: string;
}) {
	const validationCode = `
    if (${importName} === undefined) {
      throw new Error("[LiveDemo] Import '${importName}' from '${pkg}' is undefined. This export may not exist in this version of the package.");
    }
  `;

	const parsed = window.Babel?.packages.parser.parse(validationCode);
	return parsed.program.body[0];
}
