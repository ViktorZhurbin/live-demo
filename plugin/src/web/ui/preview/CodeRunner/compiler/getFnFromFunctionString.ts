import getImport from "_playground_virtual_modules";
import { GET_IMPORT_FN } from "./constants";

type ExportObject = "module" | "exports";
type ExportProperty = "exports" | "default";

export function getComponentFnFromCodeString(code: string) {
	/**
	 * In CommonJS default export is either of the two forms:
	 * - `module.exports = Component`
	 * - `exports.default = Component`
	 *
	 * We will plug in our `exportObject` into the function
	 * to get the default exported componentFn assigned to it.
	 */
	const exportObject: {
		[Prop in ExportProperty]?: React.FC;
	} = {};

	const [OBJECT_NAME, ASSIGN_TO_PROP] = resolveExportType(code);

	const fnArgNames = [GET_IMPORT_FN, OBJECT_NAME] as const;

	const func = new Function(...fnArgNames, code) as (
		getImportFn: typeof getImport,
		exportsObj: typeof exportObject,
	) => void;

	/**
	 * After this call:
	 * - `getImport` would resolve external module imports
	 * - `exportObject` would be `{ [ExportProperty]: componentFn }`
	 *
	 * Thus, we can grab the componentFn from `exportObject`
	 */
	func(getImport, exportObject);

	const componentFn = exportObject[ASSIGN_TO_PROP];

	return componentFn;
}

function resolveExportType(code: string): [ExportObject, ExportProperty] {
	if (code.includes("module.exports")) {
		return ["module", "exports"];
	}

	if (code.includes("exports.default") || code.includes('exports["default"]')) {
		return ["exports", "default"];
	}

	throw new Error("Missing default export in the file");
}
