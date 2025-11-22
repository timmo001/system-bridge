import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: 'src/**/*.test.ts',
  nodeResolve: true,

  // Use Playwright for browser automation
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
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
