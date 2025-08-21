import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '3d7'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '4da'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'bd6'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '5c2'),
            routes: [
              {
                path: '/docs/category/inline',
                component: ComponentCreator('/docs/category/inline', 'edf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/inline/basic',
                component: ComponentCreator('/docs/inline/basic', '615'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/inline/markdown-features',
                component: ComponentCreator('/docs/inline/markdown-features', 'f44'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '69a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/usage',
                component: ComponentCreator('/docs/usage', '8f4'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
