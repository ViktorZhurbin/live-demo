/**
 * Generate virtual module code for external package imports
 *
 * Problem: User code might import external packages (react, lodash, etc.)
 * Solution: Create a virtual module that re-exports all needed packages
 *
 * This virtual module is injected into node_modules at build time and
 * allows the browser-based Rollup bundler to resolve external imports.
 *
 * Generated code example:
 * ```js
 * const importsMap = new Map()
 * import * as i_0 from 'react';
 * importsMap.set('react', i_0);
 * import * as i_1 from 'lodash';
 * importsMap.set('lodash', i_1);
 *
 * function getImport(importName, getDefault) { ... }
 * export default getImport
 * ```
 *
 * Usage in browser:
 * import getImport from '_live_demo_virtual_modules'
 * const React = getImport('react')
 */

import { formatSplicedMessage } from "~shared/errors";
import { errorMessages } from "~shared/errors/messages";

const IMPORTS_MAP = "importsMap";

// importName is only known once the demo calls getImport() in the browser,
// so the token here is the literal source text `${importName}`, not a
// resolved value — spliced below inside real backticks so it becomes a
// genuine template literal in the generated code.
const importNotFoundMessage = formatSplicedMessage(
	errorMessages.EXTERNAL_IMPORT_NOT_FOUND({ importName: "${importName}" }),
);

// Template function that will be included in the virtual module
// This function allows dynamic resolution of imports by name
const getImportFnString = `const ${IMPORTS_MAP} = new Map()

function getImport(importName, getDefault) {
  const result = ${IMPORTS_MAP}.get(importName)

  if (!result) {
    throw new Error(\`${importNotFoundMessage}\`)
  }

	if (getDefault && typeof result === "object") {
		return result.default || result
	}

	return result
}

export default getImport`;

/**
 * Generate code for a virtual module that re-exports all external packages
 *
 * The generated module:
 * 1. Imports all external packages (react, lodash, etc.)
 * 2. Stores them in a Map for dynamic lookup
 * 3. Exports a function to retrieve packages by name
 *
 * This is injected as a virtual module at build time via
 * rsbuild-plugin-virtual-module (see `plugin.ts`).
 *
 * @param allImports - Set of all external package names found in user code
 * @returns JavaScript code as a string to be used as a virtual module
 */
export const getVirtualModulesCode = (allImports: Set<string>) => {
	const moduleCodeString = Array.from(allImports).reduce<string>(
		(acc, moduleName, index) => {
			const name = `'${moduleName}'`;
			const value = `i_${index}`; // Unique identifier for each import

			// Generate: import * as i_0 from 'react';
			const importStatement = `import * as ${value} from ${name};`;
			// Generate: importsMap.set('react', i_0);
			const addToImportsMap = `${IMPORTS_MAP}.set(${name}, ${value});`;

			return `${acc}\n\n${importStatement}\n${addToImportsMap}`;
		},
		getImportFnString, // Start with the getImport function template
	);

	return moduleCodeString;
};
