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

          // import { a, b, importedName: localName } from 'pkg'
          if (specifier.type === "ImportSpecifier") {
            if (
              "name" in specifier.imported &&
              specifier.imported.name !== specifier.local.name
            ) {
              // import { importedName: localName } from 'pkg'
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
          const node = createGetImportDeclaration({ pkg, imported });

          code.push(node);
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
}: { imported: string; pkg: string; isDefault?: boolean }) {
  const getImport = `${GET_IMPORT_FN}('${pkg}', ${isDefault})`;

  const importString = `const ${imported} = ${getImport}`;

  return getParsedVariableDeclaration(importString);
}
