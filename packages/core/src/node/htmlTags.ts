export const htmlTags = [
  // Load Babel and Rollup through script tags
  {
    tag: "script",
    head: true,
    attrs: {
      src: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js",
      integrity: "sha256-oShy6o2j0psqKWxRv6x8SC6BQZx1XyIHpJrZt3IA9Oo=",
      crossorigin: "anonymous",
    },
  },
  {
    tag: "script",
    head: true,
    attrs: {
      src: "https://cdn.jsdelivr.net/npm/@rollup/browser@4.31.0/dist/rollup.browser.min.js",
    },
  },
];
