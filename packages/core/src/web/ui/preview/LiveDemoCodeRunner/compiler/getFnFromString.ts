import getImport from "_live_demo_virtual_modules";
import { EXPORTS_OBJ, GET_IMPORT_FN } from "./constants";

export function getFnFromString(fnCode: string) {
  /**
   * Export is transformed by babel to always be `exports.default`.
   *
   * We will plug in `exportsStub` object into the function
   * as the second argument named 'exports'.
   * Then we will call the function, and get the exported componentFn
   * assigned to its `exportsStub.default` property.
   * */
  const exportsStub: Record<string, React.FC> = {};

  const [OBJECT_NAME, ASSIGN_TO_PROP] = EXPORTS_OBJ.split(".");

  const fnArgNames = [GET_IMPORT_FN, OBJECT_NAME];

  const func = new Function(...fnArgNames, fnCode) as (
    getImportFn: typeof getImport,
    exportsObj: typeof exportsStub,
  ) => void;

  /**
   * After this call:
   * - `getImport` would resolve external module imports
   * - `exportsStub` would be `{ default: componentFn }`
   * */
  func(getImport, exportsStub);

  const componentFn = exportsStub[ASSIGN_TO_PROP];

  return componentFn;
}

// type ExportObject = "module" | "exports";
// type ExportProperty = "exports" | "default";

// function resolveExportType(code: string): [ExportObject, ExportProperty] {
// 	if (code.includes("module.exports")) {
// 		return ["module", "exports"];
// 	}

// 	if (code.includes("exports.default") || code.includes('exports["default"]')) {
// 		return ["exports", "default"];
// 	}

// 	throw new Error("Missing default export in the file");
// }
