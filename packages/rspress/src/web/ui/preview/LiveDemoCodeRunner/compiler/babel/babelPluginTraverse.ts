import type { Node, PluginItem } from "@babel/core";
import type { VariableDeclaration } from "@babel/types";
import { EXPORTS_OBJ, GET_IMPORT_FN } from "../constants";

export const babelPluginTraverse = (): PluginItem => {
  let hasReactImported = false;

  return {
    pre() {
      hasReactImported = false;
    },

    visitor: {
      ImportDeclaration(path) {
        const pkg = path.node.source.value;

        const code: Node[] = [];
        const namedImports: string[] = [];

        for (const specifier of path.node.specifiers) {
          if (specifier.local.name === "React") {
            hasReactImported = true;
          }
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

    post(file) {
      // Auto import React
      if (!hasReactImported) {
        const node = createGetImportDeclaration({
          pkg: "react",
          imported: "React",
          isDefault: true,
        });

        file.ast.program.body.unshift(node);
      }
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
