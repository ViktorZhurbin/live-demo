Here is an updated review of the main concerns, bugs, and feature requests raised for `@rspress/plugin-playground` and `@rspress/plugin-preview` in the `web-infra-dev/rspress` GitHub repository, complete with real issue links, response counts, and reaction metrics where available.

---

## 1. Concerns & Issues with `@rspress/plugin-playground`

`@rspress/plugin-playground` compiles and executes code live in the browser using `@babel/standalone` and Monaco editor.

| Issue / Request                                              | Issue #                                                                                                                                                                     | Comments | Reactions | Details & User Feedback                                                                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No Relative Import / Multi-File Support**                  | [#2402](https://github.com/web-infra-dev/rspress/issues/2402)                                                                                                               | 3        | ❤️ 1      | Users trying `import utils from './utils'` hit build errors. Maintainers clarified that `plugin-playground` has no file graph resolver and demo blocks must be completely self-contained in a single file. |
| **Style Pollution / Lack of Isolation**                      | [#1394](https://www.google.com/search?q=https://github.com/web-infra-dev/rspress/issues/1394) _(ref in [#1105](https://github.com/web-infra-dev/rspress/discussions/1105))_ | —        | —         | Because playground renders directly into the host page DOM tree, demo CSS leaks out into doc theme styles. Users requested an `iframe` mode specifically to isolate styles.                                |
| **Incompatibility when co-registered with `plugin-preview**` | [#1452](https://github.com/web-infra-dev/rspress/issues/1452)                                                                                                               | 2        | —         | Registering both plugins simultaneously broke `plugin-preview`, causing preview codeblocks to render as plain unrendered code. Acknowledged by maintainers as a V1 architecture conflict.                  |
| **Cross-Framework (Vue/Svelte) Requests**                    | [#133](https://github.com/web-infra-dev/rspress/issues/133)                                                                                                                 | 2+       | —         | Requests for non-React interactive playground support. Maintainers confirmed playground execution is tied strictly to React and the theme.                                                                 |

---

## 2. Concerns & Issues with `@rspress/plugin-preview`

`@rspress/plugin-preview` builds static component previews at compile-time by spawning secondary Rsbuild instances.

| Issue / Request                                 | Issue #                                                                                       | Comments | Reactions | Details & User Feedback                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| **UI & Layout Styling Enhancements**            | [#1315](https://github.com/web-infra-dev/rspress/issues/1315)                                 | —        | —         | Requests to polish the default styling and layout controls of preview blocks.                                     |
| **Code Highlighting in TSX Preview Blocks**     | [#1113](https://www.google.com/search?q=https://github.com/web-infra-dev/rspress/issues/1113) | —        | —         | Enhancements requested for syntax highlighting inside TypeScript preview blocks.                                  |
| **Resizable Iframe Viewport**                   | [#2812](https://github.com/web-infra-dev/rspress/issues/2812)                                 | 1+       | —         | Feature request to add a UI resizer handle to the `preview="iframe-follow"` layout.                               |
| **Vue SFC Support in Preview**                  | [#2032](https://github.com/web-infra-dev/rspress/issues/2032)                                 | 1+       | —         | Discussion on using `iframeOptions.customEntry` to support Vue component previews via an isolated bundle process. |
| **Infinite Re-render Crash on Viewport Resize** | [#2765](https://github.com/web-infra-dev/rspress/issues/2765)                                 | 1+       | —         | Resizing the browser window on a preview page triggers `Uncaught Error: Maximum update depth exceeded`.           |

---

## 3. Major V2 Architectural & Breaking Changes

In the **Rspress v2.0** milestone ([Discussion #1105](https://github.com/web-infra-dev/rspress/discussions/1105) and [Discussion #1891](https://github.com/web-infra-dev/rspress/discussions/1891)):

1. **Deprecated `<code src="..." />` Syntax:**
   Replaced with Markdown file codeblock syntax (` ```tsx file="./foo.tsx"`).
2. **Sass/Less Unbundling:**
   Built-in Sass/Less support was removed from preview builds. Users must explicitly pass `@rsbuild/plugin-sass` or `@rsbuild/plugin-less` via `iframeOptions.builderConfig`.
3. **Refactored Plugin Integration:**
   V2 addresses mutual registration bugs (such as [#1452](https://github.com/web-infra-dev/rspress/issues/1452)) by refactoring how code block meta flags (`playground` vs `preview`) are processed.

---

### Summary of Community Pain Points

- **For `@rspress/plugin-playground`:** The top limitations driving developers to custom solutions (like `@live-demo/rspress`) are the **lack of multi-file/relative imports** ([#2402](https://github.com/web-infra-dev/rspress/issues/2402)) and **CSS pollution** due to missing iframe isolation ([#1394](https://www.google.com/search?q=https://github.com/web-infra-dev/rspress/issues/1394)).
- **For `@rspress/plugin-preview`:** The main issues center on **UI customization flexibilities** ([#1315](https://github.com/web-infra-dev/rspress/issues/1315), [#2812](https://github.com/web-infra-dev/rspress/issues/2812)) and migration friction around lost preprocessor defaults in v2.
