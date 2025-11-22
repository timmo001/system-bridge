import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { fromRollup } from '@web/dev-server-rollup';
import rollupAlias from '@rollup/plugin-alias';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const alias = fromRollup(rollupAlias);

export default {
  files: 'src/**/*.test.ts',
  nodeResolve: true,

  // Use Playwright for browser automation
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],

  // Plugins for module resolution
  plugins: [
    esbuildPlugin({ ts: true }),
    alias({
      entries: [
        { find: '~', replacement: resolve(__dirname, './src') },
      ],
    }),
  ],

  // Test framework configuration
  testFramework: {
    config: {
      timeout: 3000,
    },
  },

  // Coverage configuration (optional, can enable later)
  coverage: false,

  // Watch mode configuration
  watch: false,

  // Fail on first failing test group
  testsFinishTimeout: 60000,
};
