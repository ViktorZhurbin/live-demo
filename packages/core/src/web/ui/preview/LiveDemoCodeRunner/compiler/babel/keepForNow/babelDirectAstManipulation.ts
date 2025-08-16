import type { Node, PluginItem } from "@babel/core";
import {
  createGetImport,
  createObjectPattern,
  createVariableDeclaration,
} from "./ast";

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
        const specifiers: (string | [string, string])[] = [];
        for (const specifier of path.node.specifiers) {
          if (specifier.local.name === "React") {
            hasReactImported = true;
          }
          // import X from 'foo'
          if (specifier.type === "ImportDefaultSpecifier") {
            // const ${specifier.local.name} = __get_import()
            code.push(
              createVariableDeclaration(
                specifier.local.name,
                createGetImport(pkg, true),
              ),
            );
          }
          // import * as X from 'foo'
          if (specifier.type === "ImportNamespaceSpecifier") {
            // const ${specifier.local.name} = __get_import()
            code.push(
              createVariableDeclaration(
                specifier.local.name,
                createGetImport(pkg),
              ),
            );
          }
          // import { a, b, c } from 'foo'
          if (specifier.type === "ImportSpecifier") {
            if (
              "name" in specifier.imported &&
              specifier.imported.name !== specifier.local.name
            ) {
              // const {${specifier.imported.name}: ${specifier.local.name}} = __get_import()
              specifiers.push([specifier.imported.name, specifier.local.name]);
            } else {
              // const {${specifier.local.name}} = __get_import()
              specifiers.push(specifier.local.name);
            }
          }
        }
        if (specifiers.length > 0) {
          code.push(
            createVariableDeclaration(
              createObjectPattern(specifiers),
              createGetImport(pkg),
            ),
          );
        }
        path.replaceWithMultiple(code);
      },
      ExportSpecifier(_path) {
        // console.log("ExportSpecifier", path.node);
      },
    },
    post(file) {
      // Auto import React
      if (!hasReactImported) {
        file.ast.program.body.unshift(
          createVariableDeclaration("React", createGetImport("react", true)),
        );
      }
    },
  };
};
