import type { Node, PluginItem } from "@babel/core";
import type { VariableDeclaration } from "@babel/types";
import { formatSplicedMessage } from "~shared/errors";
import { errorMessages } from "~shared/errors/messages";

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
							// Stored internally as "importedName: localName" for destructuring
							namedImports.push(
								`${specifier.imported.name}: ${specifier.local.name}`,
							);
						} else {
							namedImports.push(specifier.local.name);
						}
					}
				}

				if (namedImports.length > 0) {
					const imported = `{ ${namedImports.join(", ")} }`;
					const importNode = createGetImportDeclaration({ pkg, imported });
					code.push(importNode);

					const importNames = namedImports.map((importString) => {
						// Extract local name from internal format: "importedName: localName" -> "localName".
						// A plain name has no colon, so it falls back to itself.
						const [, localName = importString] = importString.split(":");

						return localName.trim();
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
	importName: string;
	pkg: string;
}) {
	// Generated code can't import LiveDemoError, so splice the formatted
	// text (message + hint) in as a plain string instead.
	const message = formatSplicedMessage(
		errorMessages.UNDEFINED_NAMED_IMPORT({ importName, pkg }),
	);

	const validationCode = `
    if (${importName} === undefined) {
      throw new Error(${JSON.stringify(message)});
    }
  `;

	const parsed = window.Babel?.packages.parser.parse(validationCode);
	return parsed.program.body[0];
}
