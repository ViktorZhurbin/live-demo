const IMPORTS_MAP = "importsMap";

const getImportFnString = `const ${IMPORTS_MAP} = new Map()

function getImport(importName, getDefault) {
  const result = ${IMPORTS_MAP}.get(importName)

  if (!result) {
    throw new Error(\`Can't resolve \${importName}.\`)
  }

	if (getDefault && typeof result === "object") {
		return result.default || result
	}

	return result
}

export default getImport`;

/**
 * Prepares a string template to be injected into
 * node_modules with RspackVirtualModulePlugin.
 * It will be used to resolve external modules
 * when compiling code in the browser
 *
 * Usage:
 * import getImport from '_live_demo_virtual_modules'
 *
 * getImport('react')
 */
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
