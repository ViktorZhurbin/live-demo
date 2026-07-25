## What the two v2 plugins actually are now

**`@rspress/plugin-preview`** — no in-browser compilation at all. The remark plugin writes each demo's code to a real file under `node_modules/.rspress/virtual-demo/`, imports it as a normal module, and the bundler compiles it. Its distinguishing feature is `iframe-fixed` / `iframe-follow`: it spins up a _second, complete Rsbuild instance_ with its own dev server (port 7890) and generated entries, so demos get real bundling and full style isolation, plus a QR code to open them on a phone.

**`@rspress/plugin-playground`** — the one you forked from. Still Babel-standalone-from-CDN + Monaco-from-CDN, still single-file, still one global `Playground` component. Architecturally almost unchanged from v1: `routeGenerated` scans all MDX for imports → writes one virtual module; remark rewrites code blocks to `<Playground code=... />`.

## The v2 changes that matter to you

1. **`<code src>` is gone.** Both plugins migrated to core's File Code Block: ` ```tsx file="./_demo.tsx" preview `. Their migration guide states it flatly.

2. **`defaultRenderMode: 'pure' | 'preview'`** with a `pure` escape hatch, on _both_ plugins, and both docs explicitly warn against changing it "because it may affect combined usage with the other plugin." They designed for coexistence on one site. You don't have this axis at all — `live` is always opt-in. Adding `defaultRenderMode` plus a `pure` marker is small and is the thing that makes "convert an existing docs site" a config change rather than a find-and-replace.

Idea: pass "preview" code-block meta to set demo's default view to Preview (default is Split View)

3. **Per-block options parsed out of meta, with a three-level precedence chain**: code-block meta (`direction=vertical`) > page frontmatter (`playgroundDirection: vertical`) > plugin option (injected via `source.define` as `__PLAYGROUND_DIRECTION__`). Frontmatter is read at _runtime_ through `usePageData()`, so it costs nothing at build time. Your `options.ui` is plugin-level only and gets `JSON.stringify`d into the attributes of every single demo node ([remarkPlugin.ts:182](packages/rspress/src/node/remarkPlugin.ts:182)). Their `define` approach keeps build-wide config out of the MDX AST entirely.

4. **`previewLanguages` + `previewCodeTransform`.** A user-supplied `({ language, code }) => code` at the remark stage, with a configurable trigger-language list. Their example turns a JSON block into a React component. It's ~10 lines of plugin surface that lets someone support a language you've never heard of without you doing anything. Good fit for an experimental project.

5. **`include` accepts aliasing tuples**: `['my-package', '/path/to/package/index.js']`. Your `includeModules` is names only. The alias form is what lets a component library's own docs write `import { Button } from 'my-lib'` in a demo and have it resolve to `../src/index.ts`. That's the primary audience for this whole category of plugin, and it's a real gap.

6. **`render` option + composable web exports.** Playground lets you pass your own `Playground.tsx` and documents both `@rspress/plugin-playground/web` (exports `Editor`, `Runner`, the Monaco loader) and the generated module name `_rspress_playground_imports` as public API. Your [static/LiveDemo.tsx](packages/rspress/static/LiveDemo.tsx) path is hardcoded in [plugin.ts:36](packages/rspress/src/plugin/plugin.ts:36) and [src/web/index.ts](packages/rspress/src/web/index.ts) exports only `Button` and a type. You have a much better-factored internal component tree (`LiveDemoProvider`, `ControlPanel`, `ResizablePanels`, `CodeRunner`) and none of it is reachable by a consumer.
   My note: we did have a `customLayout` option, but removed it for simplicity - it was a footgun that easily breaks our lazy loading, and added real API surface. May reconsider later.

7. Options plumbing has a type lie and no per-demo story

- `ui.editor` is typed as full `ReactCodeMirrorProps`, but options travel through
  `JSON.stringify` in MDX attributes, so functions and CodeMirror extension instances
  (the things people most want to pass) can't survive the trip. Either narrow the type to
  the serializable subset or, better, stop serializing site-wide options per demo at all:
  they're constants for the whole site, so they could be delivered once (through the
  virtual module or a config module the layout imports), which also slims every demo's
  attribute payload and `parseProps`.
- There's no per-demo configuration (docs say so explicitly). Upstream carried fence meta
  (`direction=vertical`) through to props. Natural carriers exist already: extra fence
  meta on ` ```jsx live ` and extra attributes on `<code src>`. Worth adding for 3.0;
  "hide editor for this one demo" is a common docs need. See also `TODO.md`'s entry on
  whether `<code src>` should become explicit meta, which upstream v2 has since done.

## The one real architectural idea

Where the demo's file work happens:

|                   | import scan            | file contents            |
| ----------------- | ---------------------- | ------------------------ |
| plugin-preview    | —                      | in remark, every compile |
| plugin-playground | `routeGenerated`, once | in the AST node itself   |
| yours             | `routeGenerated`, once | `routeGenerated`, once   |

`plugin-preview` has no staleness problem because it does everything in remark, which re-runs on every MDX recompile. Playground has a mild one (a _newly added bare import_ needs a restart). You have the full version of it — your documented "editing an imported file needs a dev-server restart" limitation — because `demoDataByRef` carries file _contents_ across the seam.

The idea worth taking: **shrink what crosses `routeGenerated` → remark down to just the external-import set, and run [collectDemoFiles.ts](packages/rspress/src/node/helpers/collectDemoFiles.ts) inside the remark pass.** That's playground's split. It would delete `demoDataByRef`, `demoRefKey`, the two `console.warn`s about missing demo data, and the staleness limitation together — at the cost of reading a handful of small files per MDX compile.

The obstacle is real and worth naming before you try it: `uniqueImports` feeds the virtual module, which is generated once at build config time. If a demo gains a new bare import mid-session, the virtual module has to be regenerated. plugin-preview solves the analogous problem with `isDirtyRef` + `isDeepStrictEqual` comparison and a full dev-server restart of the demo build. You'd need something equivalent, or accept playground's residual staleness (new _external_ import → restart), which is a strictly smaller bug than the one you have.

## What not to copy

- **The iframe modes.** Two Rsbuild instances, a second dev server, port negotiation, generated entries, `postMessage` theme sync, `writeToDisk: true`, `buildCache: false`. It buys style isolation and real bundling, which is a genuinely different product from in-browser compilation. For ~22 weekly downloads it's not the trade.
- **Their state management.** `export let routeMeta`, `export const globalDemos = {}`, `export const isDirtyRef` — mutable module-level singletons in both plugins. Your parameter-passing is better; don't regress.
- **CDN-loaded Babel/Monaco.** Bundled CodeMirror + lazily-imported Sucrase is a clear improvement, and they even have [a linked issue](https://github.com/web-infra-dev/rspress/issues/876) about the UMD-loading hack it forces.

## Small, portable details

- `rp-not-doc` — a class both plugins put on their root to opt out of rspress's prose styling. Worth checking whether your UI needs that escape hatch.
- `createLogger({ prefix: picocolors.dim('[@rspress/plugin-preview]') })` from `@rsbuild/core` instead of raw `console.warn`. Integrates with the build's own output formatting.
- plugin-preview sets `data.pageMeta.haveIframeFixedDemos` from remark, so the theme layer can react per-page. Your per-page layout import already covers the equivalent need.
- Playground debounces recompilation at 800ms in the runner — worth comparing against whatever [useActiveCode.ts](packages/rspress/src/web/hooks/useActiveCode.ts) does.

---

# Preliminary search/research

Below is the review of the main concerns, bugs, and feature requests raised for `@rspress/plugin-playground` and `@rspress/plugin-preview` in the `web-infra-dev/rspress` GitHub repository, complete with real issue links, response counts, and reaction metrics where available.

## 1. Concerns & Issues with `@rspress/plugin-playground`

`@rspress/plugin-playground` compiles and executes code live in the browser using `@babel/standalone` and Monaco editor.

| Issue / Request                                              | Issue #                                                                                                                                                                     | Comments | Reactions | Details & User Feedback                                                                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No Relative Import / Multi-File Support**                  | [#2402](https://github.com/web-infra-dev/rspress/issues/2402)                                                                                                               | 3        | ❤️ 1      | Users trying `import utils from './utils'` hit build errors. Maintainers clarified that `plugin-playground` has no file graph resolver and demo blocks must be completely self-contained in a single file. |
| **Style Pollution / Lack of Isolation**                      | [#1394](https://www.google.com/search?q=https://github.com/web-infra-dev/rspress/issues/1394) _(ref in [#1105](https://github.com/web-infra-dev/rspress/discussions/1105))_ | —        | —         | Because playground renders directly into the host page DOM tree, demo CSS leaks out into doc theme styles. Users requested an `iframe` mode specifically to isolate styles.                                |
| **Incompatibility when co-registered with `plugin-preview**` | [#1452](https://github.com/web-infra-dev/rspress/issues/1452)                                                                                                               | 2        | —         | Registering both plugins simultaneously broke `plugin-preview`, causing preview codeblocks to render as plain unrendered code. Acknowledged by maintainers as a V1 architecture conflict.                  |
| **Cross-Framework (Vue/Svelte) Requests**                    | [#133](https://github.com/web-infra-dev/rspress/issues/133)                                                                                                                 | 2+       | —         | Requests for non-React interactive playground support. Maintainers confirmed playground execution is tied strictly to React and the theme.                                                                 |

## 2. Concerns & Issues with `@rspress/plugin-preview`

`@rspress/plugin-preview` builds static component previews at compile-time by spawning secondary Rsbuild instances.

| Issue / Request                                 | Issue #                                                                                       | Comments | Reactions | Details & User Feedback                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| **UI & Layout Styling Enhancements**            | [#1315](https://github.com/web-infra-dev/rspress/issues/1315)                                 | —        | —         | Requests to polish the default styling and layout controls of preview blocks.                                     |
| **Code Highlighting in TSX Preview Blocks**     | [#1113](https://www.google.com/search?q=https://github.com/web-infra-dev/rspress/issues/1113) | —        | —         | Enhancements requested for syntax highlighting inside TypeScript preview blocks.                                  |
| **Resizable Iframe Viewport**                   | [#2812](https://github.com/web-infra-dev/rspress/issues/2812)                                 | 1+       | —         | Feature request to add a UI resizer handle to the `preview="iframe-follow"` layout.                               |
| **Vue SFC Support in Preview**                  | [#2032](https://github.com/web-infra-dev/rspress/issues/2032)                                 | 1+       | —         | Discussion on using `iframeOptions.customEntry` to support Vue component previews via an isolated bundle process. |
| **Infinite Re-render Crash on Viewport Resize** | [#2765](https://github.com/web-infra-dev/rspress/issues/2765)                                 | 1+       | —         | Resizing the browser window on a preview page triggers `Uncaught Error: Maximum update depth exceeded`.           |

## 3. Major V2 Architectural & Breaking Changes

In the **Rspress v2.0** milestone ([Discussion #1105](https://github.com/web-infra-dev/rspress/discussions/1105) and [Discussion #1891](https://github.com/web-infra-dev/rspress/discussions/1891)):

1. **Deprecated `<code src="..." />` Syntax:**
   Replaced with Markdown file codeblock syntax (` ```tsx file="./foo.tsx"`).
2. **Sass/Less Unbundling:**
   Built-in Sass/Less support was removed from preview builds. Users must explicitly pass `@rsbuild/plugin-sass` or `@rsbuild/plugin-less` via `iframeOptions.builderConfig`.
3. **Refactored Plugin Integration:**
   V2 addresses mutual registration bugs (such as [#1452](https://github.com/web-infra-dev/rspress/issues/1452)) by refactoring how code block meta flags (`playground` vs `preview`) are processed.

### Summary of Community Pain Points

- **For `@rspress/plugin-playground`:** The top limitations driving developers to custom solutions (like `@live-demo/rspress`) are the **lack of multi-file/relative imports** ([#2402](https://github.com/web-infra-dev/rspress/issues/2402)) and **CSS pollution** due to missing iframe isolation ([#1394](https://www.google.com/search?q=https://github.com/web-infra-dev/rspress/issues/1394)).
- **For `@rspress/plugin-preview`:** The main issues center on **UI customization flexibilities** ([#1315](https://github.com/web-infra-dev/rspress/issues/1315), [#2812](https://github.com/web-infra-dev/rspress/issues/2812)) and migration friction around lost preprocessor defaults in v2.

---

# **Strategic Architecture Analysis of Rspress Component Playground and Preview Plugins**

(Gemini's "Deep research")

The modern developer documentation landscape has transitioned from displaying static code examples to providing fully interactive, real-time sandboxes. In the Rspress static site generator ecosystem, this interactive capability is powered by two companion plugins: @rspress/plugin-playground and @rspress/plugin-preview1. For engineering teams building customized component documentation systems, analyzing the technical hurdles, design shifts, and community-driven workarounds within these official tools is critical to designing a superior developer experience.

## **Technical Foundations and Issue Signal Metrics**

To understand the trajectory of Rspress's interactive rendering architecture, one must evaluate the historical community responses to bug reports and feature proposals. The table below presents a compiled diagnostic of core GitHub issues, highlighting key developer pain points, community interest, maintainer responsiveness, and systemic statuses.

| Issue ID               | Affected Module | Structural Problem or Core Requirement                                                                | Status & Staleness                                                     | Activity Metrics                                                                  | Community Signal & Architectural Impact                                                                                    |
| :--------------------- | :-------------- | :---------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **\#133** \[cite: 3\]  | Ecosystem Core  | Parity with Storybook, including cross-framework rendering (Vue SFC) and auto-generating API tables3. | Closed; pinned by maintainers to signify long-term roadmap relevance3. | 3 prominent heart reactions; multiple replies spanning over a year3.              | Highest community priority; triggered the integration of react-docgen-typescript and sparked cross-framework discussions3. |
| **\#1269** \[cite: 4\] | Theme Styles    | Global Tailwind utility leaks from Rspress shell polluting rendering component sandboxes4.            | Closed as stale on Mar 2 after over a year of inactivity4.             | 3 distinct thumbs-up reactions on active workarounds4.                            | High-friction design issue; forced a complete rewrite of core theme styles in V2 to use BEM conventions4.                  |
| **\#1452** \[cite: 5\] | Both Plugins    | Compiler collisions and parsing crashes when registering both plugins simultaneously5.                | Closed; integrated into V2 parent tracking issue \#15745.              | Rapidly triaged and resolved within 24 hours5.                                    | Immediate blocker for mixed docs; forced the team to unify the parsing engines in Rspress V25.                             |
| **\#2032** \[cite: 7\] | Preview         | Support for Vue Single File Components (SFC) inside React runtime context7.                           | Open; awaiting active pull requests7.                                  | Multi-developer discussion; identifies misleading documentation7.                 | Illustrates framework lock-in frustrations and documentation gaps7.                                                        |
| **\#2402** \[cite: 8\] | Playground      | Lack of relative file import resolution and support for folder structures in runtime editor8.         | Closed as "by design" (under expectation of flat playgrounds)8.        | Active community interest; prompted custom third-party core engine replacements8. | High structural frustration; led to the creation of the live-demo repository bypass8.                                      |
| **\#2765** \[cite: 2\] | Preview         | Component-rendering infinite update cascades during browser resizing events2.                         | Closed; rapidly resolved inside V2.0.0-rc.02.                          | Transferred immediately by core maintainers2.                                     | Layout stability issue; highlighted rendering vulnerability in dynamic width calculators2.                                 |
| **\#2812** \[cite: 9\] | Preview         | Demand for dynamic layout resizing tools within sandbox wrappers9.                                    | Open; cataloged as minor enhancement9.                                 | Low comment volume; focused on visual layout optimization9.                       | Reflects user demands for interactive UI testing utilities9.                                                               |

## **Deep Technical Evaluation of Ecosystem Friction Points**

Evaluating these issue patterns reveals several core engineering challenges in the V1 and early V2 lifecycles of Rspress's interactive component pipelines.

### **Flat-File Limits and Import Resolution Failures**

The standard @rspress/plugin-playground architecture operates under a flat file system model8. The underlying editor compile-and-run loop assumes all code blocks are entirely self-sufficient, allowing imports only from external npm modules inside the global environment's node\_modules directory8.
When a developer tries to split a complex demo into separate utility files or write a multi-component preview using relative imports, the compiler immediately fails8.

JavaScript
// This code pattern triggers an immediate compilation failure in standard V1/V2 setups
import { HelperButton } from './HelperButton';
import { mockData } from './data';

When this issue was raised, core maintainers explained that the playground was designed for flat structures and was not meant to resolve nested project files8. This design choice forces developers to cram styles, mock data, sub-components, and business logic into a single, massive documentation block.
To bypass this restriction, community member Viktor Zhurbin developed a complete, alternative runtime compilation engine called live-demo8. This custom engine uses a virtual filesystem to resolve relative files, support multi-file navigation, enable fullscreen views, and generate shareable playground links8.

### **Parser Collisions and Competing Markdown Pipelines**

During the V1 architecture cycle, the playground and preview plugins used separate markdown parsing tracks5. This separation made it impossible to run both plugins concurrently5. When registered together, the playground's AST transform pipeline would intercept all code blocks, preventing the preview parser from identifying its own blocks5.
As a result, any block marked as preview was treated as plain text, rendering as a raw code block instead of an executable component5. The quick resolution of this issue in V2 highlights a shift toward a unified rendering pipeline5.

### **Framework Lock-In and the Vue SFC Integration Barrier**

Rspress is deeply integrated with React, which presents a major challenge for developers documenting cross-framework component libraries3. Because the Rspress theme and core runtime run on React, the official plugins do not natively support Vue Single File Components (SFCs)3.
Developers attempting to document Vue components have run into misleading documentation7. For example, the build config docs suggest using @rsbuild/plugin-vue7. However, this only configures the bundler—it does not enable interactive Vue rendering inside Rspress markdown7.
To work around this, developers have had to write custom React wrappers that mount Vue apps inside dynamic DOM targets7:

JavaScript
import { useEffect, useRef } from 'react';
import { createApp } from 'vue';
import TargetVueComponent from './TargetVueComponent.vue';

export default function VueWrapper() {
const mountRef \= useRef(null);

useEffect(() \=\> {
if (mountRef.current) {
const app \= createApp(TargetVueComponent);
app.mount(mountRef.current);
return () \=\> {
app.unmount();
};
}
}, \[\]);

return \<div ref\={mountRef} id\="vue-render-target" /\>;
}

This approach is highly fragile and difficult to maintain across hundreds of component examples. This highlights a clear need for a framework-agnostic plugin that can isolate, compile, and render multiple UI frameworks natively.

### **Style Leaking and Namespace Pollution**

In Rspress V1, global theme styles relied on un-prefixed Tailwind CSS utility classes4. When developers loaded their own component libraries into the documentation playground, these global styles leaked into the preview sandbox4. This often resulted in broken component layouts, inaccurate margins, and style collisions4.
Developers were forced to use complex workarounds, such as configuring custom post-CSS scopes or setting up Tailwind prefixes in their projects4. Although maintainers resolved this in Rspress V2 by shifting to BEM styling for built-in components, style isolation remains a major pain point for developers using older versions or highly customized themes4.

### **Update Cascades and Layout Crashes**

During pre-release testing of Rspress V2, responsive testing of documentation layouts containing preview widgets frequently triggered React render loop crashes2. When the viewport was resized, a custom window sizing hook inside the preview wrapper triggered infinite state updates, crashing the browser2.
This issue highlights a key architectural vulnerability: linking global, high-frequency window event listeners directly to local sandbox rendering states can easily destabilize the entire documentation page.

## **Architectural Evolutions and Maintainer Pivots**

The Rspress core team has introduced several important design shifts to address these systemic issues, setting new standards for the platform's V2 release:

- **Unification of Parsing Streams**: The core maintainers consolidated the compilation pipelines of the separate playground and preview plugins into a unified module architecture under parent tracking issue \#15745. This resolved the parser collisions from V1, allowing both editable sandboxes and static previews to run side-by-side5.
- **BEM Stylesheets over Utility Frameworks**: To eliminate global style pollution and class conflicts, the default theme was refactored in V24. The maintainers removed Tailwind CSS from the internal theme files, replacing it with scoped BEM-styled stylesheets4. This change ensures that documentation styles do not leak into preview environments4.
- **Automated Typings and Prop Tables**: To improve the component documentation workflow, the core team integrated react-docgen-typescript3. This allows Rspress to automatically parse component prop interfaces and generate interactive API documentation tables directly from source files, reducing the need for manual documentation3.

## **Next-Generation Plugin Architecture Blueprint**

For developers building a custom documentation plugin to replace or improve upon @rspress/plugin-playground, addressing the historical frustrations of Rspress users requires prioritizing four main architectural goals:

### **Framework-Agnostic Preview Pipelines**

To support multiple frameworks (such as Vue SFCs, React, or SolidJS) within a React-based host app like Rspress, the playground should utilize a framework-neutral runtime compiler3.
Instead of hardcoding a specific React compilation pass into the plugin, use the sandboxed iframe template's configuration to specify the runtime entry engine7.

TypeScript
const vueSFCCompileTemplate \= (vueSourceCode: string) \=\> \`
import { createApp } from 'vue';
import { parseSFC } from 'dynamic-vue-compiler'; // Custom client-side SFC compiler

const componentObj \= parseSFC(\\\`${vueSourceCode}\\\`);
const app \= createApp(componentObj);
app.mount('\#root');
\`;

By decoupling compiling and mounting logic from the documentation platform and executing it inside an isolated iframe, the playground can render Vue, SolidJS, or Svelte component files natively. The host site only needs to manage code text states and pass the compiled strings to the iframe via postMessage.

### **Stable Layout Adjustments**

To prevent infinite loop crashes when adjusting layouts, resize handlers should update elements directly via DOM operations instead of triggering React state updates2.
This can be managed cleanly using the browser's ResizeObserver API:

TypeScript
export function bindResponsiveSandbox(iframeTarget: HTMLIFrameElement) {
const resizeObserver \= new ResizeObserver((observedEntries) \=\> {
for (const entry of observedEntries) {
const contentHeight \= entry.target.scrollHeight;
// Adjust iframe dimensions directly without triggering React re-renders
iframeTarget.style.height \= \`${contentHeight}px\`;
}
});

iframeTarget.addEventListener('load', () \=\> {
const frameBody \= iframeTarget.contentDocument?.body;
if (frameBody) {
resizeObserver.observe(frameBody);
}
});
}

Additionally, developers appreciate the ability to test component responsiveness within documentation9. Integrating a physical resize handle on the component sandbox container allows designers to easily adjust preview widths, simulating mobile and desktop viewports directly inside the documentation page9.

## **Strategic Focus Areas for Custom Plugin Developers**

For developers building a custom interactive playground plugin, focusing on these key architectural areas will help address the main limitations of current solutions:

- **In-Memory File Compilation**: Replace flat-string parsing with a virtual file system to support relative paths and clean file separation8.
- **Safe Sandbox Environments**: Use sandboxed \<iframe\> targets to ensure complete style isolation and prevent visual conflicts4.
- **Dynamic Directives for Vue SFCs**: Include client-side compilers to support Vue components natively, avoiding the need for complex, manual wrapper templates7.
- **Robust Resize Handlers**: Use direct DOM manipulation for size adjustments instead of React state updates to prevent render loop crashes2.
- **Interactive Responsive Controls**: Add viewport resize controls to help designers test components across mobile, tablet, and desktop layouts9.

#### **Works cited**

> 1. Issue \#782 · web-infra-dev/rspress \- Dependency Dashboard \- GitHub, [https://github.com/web-infra-dev/rspress/issues/782](https://github.com/web-infra-dev/rspress/issues/782)
> 2. \[Bug\]: Resizing viewport triggers \`Maximum update depth exceeded.\` · Issue \#2765 · web-infra-dev/rspress \- GitHub, [https://github.com/web-infra-dev/rspress/issues/2765](https://github.com/web-infra-dev/rspress/issues/2765)
> 3. Rspress Roadmap · Issue \#133 · web-infra-dev/rspress \- GitHub, [https://github.com/web-infra-dev/rspress/issues/133](https://github.com/web-infra-dev/rspress/issues/133)
> 4. \[Bug\]: When customizing a page using TailwindCSS, internal components encounter styling errors · Issue \#1269 · web-infra-dev/rspress \- GitHub, [https://github.com/web-infra-dev/rspress/issues/1269](https://github.com/web-infra-dev/rspress/issues/1269)
> 5. \[Bug\]: plugin-preview cannot be registered at the same time with plugin-playground · Issue \#1452 · web-infra-dev/rspress \- GitHub, [https://github.com/web-infra-dev/rspress/issues/1452](https://github.com/web-infra-dev/rspress/issues/1452)
> 6. \[Feature\]: optimize @rspress/plugin-preview style \#1315 \- GitHub, [https://github.com/web-infra-dev/rspress/issues/1315](https://github.com/web-infra-dev/rspress/issues/1315)
> 7. \[Feature\]: @rspress/plugin-preview support Vue SFC · Issue \#2032 \- GitHub, [https://github.com/web-infra-dev/rspress/issues/2032](https://github.com/web-infra-dev/rspress/issues/2032)
> 8. \[Bug\]: Playground Plugin doesn't support relative import · Issue \#2402 · web-infra-dev/rspress \- GitHub, [https://github.com/web-infra-dev/rspress/issues/2402](https://github.com/web-infra-dev/rspress/issues/2402)
> 9. \[Feature\]: preview Resizer of \` \`\`\`tsx preview="iframe-follow ... \- GitHub, [https://github.com/web-infra-dev/rspress/issues/2812](https://github.com/web-infra-dev/rspress/issues/2812)
> 10. react-babylonjs/README.md at master \- GitHub, [https://github.com/brianzinn/react-babylonjs/blob/master/README.md](https://github.com/brianzinn/react-babylonjs/blob/master/README.md)
> 11. Requirement records for Rspress v2.0.0 \#1105 \- GitHub, [https://github.com/web-infra-dev/rspress/discussions/1105](https://github.com/web-infra-dev/rspress/discussions/1105)
> 12. GitHub \- web-infra-dev/rspress: A fast Rsbuild-based static site generator., [https://github.com/web-infra-dev/rspress](https://github.com/web-infra-dev/rspress)
