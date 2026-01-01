/**
 * HTML tags injected into the document head by Rspress plugin
 *
 * These scripts enable in-browser compilation of React code:
 * - Babel: Transpiles JSX and modern JS to browser-compatible code
 * - Rollup: Bundles modules and resolves imports in the browser
 *
 * Why CDN scripts?
 * - Babel and Rollup are large and only needed for interactive examples
 * - Loading from CDN keeps the main bundle small
 * - CDN versions are cached across sites
 *
 * Note: These only load on pages that use the LiveDemo component
 */
export const htmlTags = [
  // Babel: Transpiles JSX and TypeScript to JavaScript in the browser
  {
    tag: "script",
    head: true,
    attrs: {
      src: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.3/babel.min.js",
    },
  },
  // Rollup: Bundles and resolves module imports in the browser
  {
    tag: "script",
    head: true,
    attrs: {
      src: "https://cdn.jsdelivr.net/npm/@rollup/browser@4.46.3/dist/rollup.browser.min.js",
    },
  },
];
