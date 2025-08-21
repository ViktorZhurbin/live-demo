# @live-demo/plugin-docusaurus

Docusaurus plugin for interactive live demos, converted from the rspress plugin.

## Installation

```bash
npm install @live-demo/plugin-docusaurus
```

## Usage

Add the plugin and remark plugin to your `docusaurus.config.js`:

```javascript
import { liveDemoPluginDocusaurus, liveDemoRemarkPlugin } from '@live-demo/plugin-docusaurus';

const config = {
  // ... other config
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          remarkPlugins: [
            [liveDemoRemarkPlugin, {
              // Optional: customize UI components
              options: {
                controlPanel: { hide: false },
                fileTabs: { hideSingleTab: true },
                editor: {
                  basicSetup: {
                    lineNumbers: true,
                    foldGutter: true,
                  },
                },
              }
            }]
          ],
        },
      },
    ],
  ],
  plugins: [
    [
      liveDemoPluginDocusaurus,
      {
        includeModules: ['@your/library'], // Optional: modules to include in demos
      },
    ],
  ],
};
```

## MDX Component Registration

The plugin automatically registers the `LiveDemo` component globally via theme swizzling. You can use it in your MDX files:

```mdx
<LiveDemo>
<code src="./path/to/Demo.tsx" />
</LiveDemo>
```
## Custom Layout

You can provide a custom layout component:

```javascript
const config = {
  plugins: [
    [
      '@live-demo/plugin-docusaurus',
      {
        customLayout: path.join(__dirname, 'src/components/CustomLiveDemo/LiveDemo.tsx'),
      },
    ],
  ],
};
```

The custom layout file must:
- Have a default export
- End with `LiveDemo.(jsx|tsx)`
- Accept `LiveDemoStringifiedProps` as props

## Example Custom Layout

```tsx
import "@live-demo/core/web/index.css";
import { LiveDemoCore, type LiveDemoStringifiedProps } from "@live-demo/core/web";
import { useColorMode } from '@docusaurus/theme-common';

const CustomLiveDemo = (props: LiveDemoStringifiedProps) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <div className="custom-wrapper">
      <LiveDemoCore pluginProps={props} isDark={isDark} />
    </div>
  );
};

export default CustomLiveDemo;
```

## Complete Example

Here's a minimal working `docusaurus.config.js`:

```javascript
import { liveDemoPluginDocusaurus, liveDemoRemarkPlugin } from '@live-demo/plugin-docusaurus';

export default {
  title: 'My Site',
  tagline: 'My site with live demos',
  url: 'https://mysite.com',
  baseUrl: '/',

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          remarkPlugins: [liveDemoRemarkPlugin],
        },
      },
    ],
  ],

  plugins: [liveDemoPluginDocusaurus],
};
```

Then in your markdown files you can use:

```mdx
# My Documentation

Here's an inline demo:

```jsx live
function HelloWorld() {
  return <div>Hello, World!</div>;
}
```

And here's an external demo:

```mdx
<code src="./components/MyDemo.tsx" />
```
