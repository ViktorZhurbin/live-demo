export const htmlTags = [
  // Load Babel and Rollup through script tags
  {
    tag: "script",
    head: true,
    attrs: {
      src: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.3/babel.min.js",
    },
  },
  {
    tag: "script",
    head: true,
    attrs: {
      src: "https://cdn.jsdelivr.net/npm/@rollup/browser@4.46.3/dist/rollup.browser.min.js",
    },
  },
];
