// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightContextualMenu from 'starlight-contextual-menu';
import starlightLinksValidator from 'starlight-links-validator';

// https://astro.build/config
export default defineConfig({
  site: 'https://system-bridge.timmo.dev',
  // Old site served docs under /docs/*. Keep those URLs working after the
  // Starlight migration moved pages to the site root.
  redirects: {
    '/docs': '/overview',
    '/docs/install': '/install',
    '/docs/running': '/running',
    '/docs/cli': '/using/cli',
    '/cli': '/using/cli',
    '/docs/api/data': '/api/data',
    '/docs/api/media-file-data': '/api/media-file-data',
    '/docs/websocket/data-get': '/api/websocket/data#requesting-data',
    '/docs/websocket/data-register-listener': '/api/websocket/data#registering-as-a-listener',
    '/docs/websocket/data-receive': '/api/websocket/data#receiving-data',
    '/docs/websocket/exit-application': '/api/websocket/system#exit-application',
    '/docs/websocket/keyboard-keypress': '/api/websocket/input#keyboard-keypress',
    '/docs/websocket/keyboard-text': '/api/websocket/input#keyboard-text',
    '/docs/websocket/media-control': '/api/websocket/control#media-control',
    '/docs/websocket/notification': '/api/websocket/control#send-notification',
    '/docs/websocket/open-path': '/api/websocket/control#open-a-path',
    '/docs/websocket/open-url': '/api/websocket/control#open-a-url',
    '/docs/websocket/power-control': '/api/websocket/control#power-control',
    '/websocket/overview': '/api/websocket',
    '/api/websocket/overview': '/api/websocket',
    '/websocket/data-get': '/api/websocket/data#requesting-data',
    '/websocket/data-register-listener': '/api/websocket/data#registering-as-a-listener',
    '/websocket/data-receive': '/api/websocket/data#receiving-data',
    '/websocket/exit-application': '/api/websocket/system#exit-application',
    '/websocket/keyboard-keypress': '/api/websocket/input#keyboard-keypress',
    '/websocket/keyboard-text': '/api/websocket/input#keyboard-text',
    '/websocket/media-control': '/api/websocket/control#media-control',
    '/websocket/notification': '/api/websocket/control#send-notification',
    '/websocket/open-path': '/api/websocket/control#open-a-path',
    '/websocket/open-url': '/api/websocket/control#open-a-url',
    '/websocket/power-control': '/api/websocket/control#power-control',
    '/websocket/filesystem': '/api/websocket/system#files--directories',
    '/websocket/settings': '/api/websocket/system#settings',
    '/websocket/command-execute': '/api/websocket/system#execute-command',
  },
  integrations: [
    icon(),
    sitemap(),
    starlight({
      title: 'System Bridge',
      favicon: '/system-bridge.svg',
      customCss: ['./src/styles/starlight.css', './src/styles/landing.css'],
      editLink: {
        baseUrl: 'https://github.com/timmo001/system-bridge/edit/dev/docs/',
      },
      lastUpdated: true,
      plugins: [
        starlightLinksValidator(),
        starlightLlmsTxt({
          projectName: 'System Bridge',
          description: 'Monitor and control your system with a local API and WebSocket.',
          promote: ['index*', 'overview*'],
        }),
        starlightContextualMenu({
          actions: ['copy', 'view'],
        }),
      ],
      head: [
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://system-bridge.timmo.dev/social.jpg' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '2560' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '1440' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://system-bridge.timmo.dev/social.jpg' },
        },
      ],
      components: {
        SocialIcons: './src/components/SocialIcons.astro',
        PageFrame: './src/components/PageFrame.astro',
      },
      social: [
        { icon: 'pencil', label: 'Website Repository', href: 'https://github.com/timmo001/system-bridge/tree/dev/docs' },
        { icon: 'comment', label: 'Discussions', href: 'https://github.com/timmo001/system-bridge/discussions' },
        { icon: 'github', label: 'GitHub', href: 'https://github.com/timmo001/system-bridge' },
      ],
      sidebar: [
        { label: 'Overview', slug: 'overview' },
        {
          label: 'Getting Started',
          items: [
            { label: 'Install', slug: 'install' },
            { label: 'Running', slug: 'running' },
          ],
        },
        {
          label: 'Using',
          items: [
            { label: 'Desktop', slug: 'using/desktop' },
            { label: 'CLI', slug: 'using/cli' },
            { label: 'TUI', slug: 'using/tui' },
            { label: 'Web Client', slug: 'using/web-client' },
            { label: 'Home Assistant', slug: 'using/home-assistant' },
          ],
        },
        {
          label: 'API',
          items: [
            { label: 'Overview', slug: 'api' },
            {
              label: 'HTTP',
              items: [
                { label: 'Overview', slug: 'api/http' },
                { label: 'Status & Health', slug: 'api/status' },
                { label: 'Data', slug: 'api/data' },
                { label: 'Media File Data', slug: 'api/media-file-data' },
              ],
            },
            {
              label: 'WebSocket',
              items: [
                { label: 'Overview', slug: 'api/websocket' },
                { label: 'Data', slug: 'api/websocket/data' },
                { label: 'Input', slug: 'api/websocket/input' },
                { label: 'Control', slug: 'api/websocket/control' },
                { label: 'System', slug: 'api/websocket/system' },
              ],
            },
            { label: 'MCP Server', slug: 'api/mcp' },
          ],
        },
        { label: 'LLMs', slug: 'llms' },
      ],
    }),
  ],
});
