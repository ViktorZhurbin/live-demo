declare module "_live_demo_virtual_modules" {
	const getImport: (name: string, isDefault?: boolean) => unknown;

	/** Resolves the named externals so `getImport` can return them synchronously. */
	export function loadImports(importNames: readonly string[]): Promise<void>;

	export default getImport;
}

declare module "*.module.css" {
	const classes: { readonly [key: string]: string };
	export default classes;
}

declare module "*.css";
