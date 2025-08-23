import type { LiveDemoLanguage } from "./constants";

export type PathWithAllowedExt = `${string}.${LiveDemoLanguage}`;

/**
 * Modules that will be available in demos.
 * @defaultValue `["react"]`
 *
 * These are collected from external demos at build time.
 *
 * You can also use `includeModules` option of the plugin,
 * to make some modules available in inline demos.
 **/
export type UniqueImports = Set<string>;

/**
 * `Record<fileName, fileContentsString>`
 */
export type LiveDemoFiles = Record<string, string>;
