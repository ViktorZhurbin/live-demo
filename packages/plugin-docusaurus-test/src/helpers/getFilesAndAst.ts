import type { Program } from "@oxc-project/types";
import fs from "fs";
import { parseSync } from "oxc-parser";
import type { LiveDemoFiles, PathWithAllowedExt } from "shared/types";

type GetFilesAndAst = {
  fileName: string;
  absolutePath: PathWithAllowedExt;
};

export const getFilesAndAst = (
  params: GetFilesAndAst,
): { files: LiveDemoFiles; ast: Program } => {
  const { absolutePath, fileName } = params;

  const files: LiveDemoFiles = {};

  const code = fs.readFileSync(absolutePath, { encoding: "utf8" });

  files[fileName] = code;

  const parsed = parseSync(fileName, code, {
    sourceType: "module",
  });

  const ast = parsed.program;

  return { files, ast };
};
