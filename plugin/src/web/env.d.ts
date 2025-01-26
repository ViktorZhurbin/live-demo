declare module "_live_demo_virtual_modules" {
	const getImport: (name: string) => void;

	export default getImport;
}

declare module "*.module.css" {
	const classes: { readonly [key: string]: string };
	export default classes;
}
