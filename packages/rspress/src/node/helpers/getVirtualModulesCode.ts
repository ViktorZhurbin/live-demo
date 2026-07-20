/**
 * Builds the source for `_live_demo_virtual_modules`, injected via
 * `rsbuild-plugin-virtual-module` (see `plugin.ts`) so the browser-side
 * Rollup bundler can resolve external imports (react, lodash, etc.) that
 * demo code references but never bundles itself.
 *
 * Generated shape:
 * ```js
 * const importsMap = new Map()
 * importsMap.set('react', () => import('react'));
 *
 * export async function loadImports(importNames) { ... }
 * function getImport(importName, getDefault) { ... }
 * export default getImport
 * ```
 * Consumed in the browser as `import getImport from '_live_demo_virtual_modules'`.
 *
 * Each external is a `() => import(...)` thunk rather than a static
 * `import * as`, because this is **one module for the whole site**: the set is
 * the union of externals across every demo on every page. Static imports made
 * the consuming bundler pull all of them into the demo-runtime chunk, so a
 * counter demo paid for another page's three.js. Thunks let each external
 * code-split, and `bundleCode` awaits only the ones its demo actually
 * imports before evaluating it.
 *
 * `getImport` stays synchronous — the evaluated bundle calls it during module
 * init and can't await — so resolution is split in two: `loadImports` awaits
 * the thunks into `resolvedMap` up front, `getImport` only reads that map.
 */

import { formatSplicedMessage } from "~shared/errors";
import { errorMessages } from "~shared/errors/messages";

const IMPORTS_MAP = "importsMap";
const RESOLVED_MAP = "resolvedMap";

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
const ${RESOLVED_MAP} = new Map()

export async function loadImports(importNames) {
  await Promise.all(
    importNames.map(async (importName) => {
      // Unknown names are skipped, not rejected: getImport throws a message
      // naming the import, which is far more useful than failing here.
      if (${RESOLVED_MAP}.has(importName)) return

      const loader = ${IMPORTS_MAP}.get(importName)

      if (loader) {
        ${RESOLVED_MAP}.set(importName, await loader())
      }
    })
  )
}

function getImport(importName, getDefault) {
  const result = ${RESOLVED_MAP}.get(importName)

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
		(acc, moduleName) => {
			const name = `'${moduleName}'`;

			// A literal specifier, not a variable — the consuming bundler has to
			// see it statically to emit a chunk for it.
			const addToImportsMap = `${IMPORTS_MAP}.set(${name}, () => import(${name}));`;

			return `${acc}\n\n${addToImportsMap}`;
		},
		getImportFnString,
	);

	return moduleCodeString;
};
