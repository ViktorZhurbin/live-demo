/**
 * Builds the source for `_live_demo_virtual_modules`, injected via
 * `rsbuild-plugin-virtual-module` (see `plugin.ts`) so the browser-side
 * Rollup bundler can resolve external imports (react, lodash, etc.) that
 * demo code references but never bundles itself.
 *
 * Generated shape:
 * ```js
 * const importsMap = new Map()
 * import * as i_0 from 'react';
 * importsMap.set('react', i_0);
 *
 * function getImport(importName, getDefault) { ... }
 * export default getImport
 * ```
 * Consumed in the browser as `import getImport from '_live_demo_virtual_modules'`.
 */

import { formatSplicedMessage } from "~shared/errors";
import { errorMessages } from "~shared/errors/messages";

const IMPORTS_MAP = "importsMap";

// importName is only known once the demo calls getImport() in the browser,
// so the token here is the literal source text `${importName}`, not a
// resolved value — spliced below inside real backticks so it becomes a
// genuine template literal in the generated code. This only stays valid
// generated JS because EXTERNAL_IMPORT_NOT_FOUND's message (messages.ts)
// is guaranteed free of backticks and other `${...}` sequences.
const importNotFoundMessage = formatSplicedMessage(
	errorMessages.EXTERNAL_IMPORT_NOT_FOUND({ importName: "${importName}" }),
);

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

export const getVirtualModulesCode = (allImports: Set<string>) => {
	const moduleCodeString = Array.from(allImports).reduce<string>(
		(acc, moduleName, index) => {
			const name = `'${moduleName}'`;
			const value = `i_${index}`;

			const importStatement = `import * as ${value} from ${name};`;
			const addToImportsMap = `${IMPORTS_MAP}.set(${name}, ${value});`;

			return `${acc}\n\n${importStatement}\n${addToImportsMap}`;
		},
		getImportFnString,
	);

	return moduleCodeString;
};
