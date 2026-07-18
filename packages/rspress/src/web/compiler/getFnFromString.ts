import getImport from "_live_demo_virtual_modules";
import { LiveDemoError } from "~shared/errors";

import { EXPORTS_OBJ, GET_IMPORT_FN } from "./constants";

/**
 * Evaluate a bundled demo and return its default-exported component.
 *
 * **This is not a sandbox.** `new Function` runs the demo in the host origin
 * with full access to the page's DOM, globals, storage and React instance,
 * and the component is rendered straight into the host React tree. The
 * `react-error-boundary` around it catches render errors; it is not a
 * security boundary.
 *
 * That's an accepted trade for a docs tool whose demo authors are as trusted
 * as the docs themselves. If demos ever come from untrusted sources, or need
 * style isolation, this is the seam an iframe/Worker would replace — see
 * CLAUDE.md's isolation-model section before changing it.
 */
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

	// The bundle is expected to assign the demo component to `exports.default`.
	// If it didn't, the demo has no default export — fail with a clear message
	// instead of rendering `undefined` as a component further downstream.
	// Guard only against missing (null/undefined): memo/forwardRef components
	// are objects, not functions, but are still valid default exports.
	if (componentFn == null) {
		throw new LiveDemoError("NO_DEFAULT_EXPORT", {});
	}

	return componentFn;
}
