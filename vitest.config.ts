// Vitest config — JS test harness for bug-simulator.
//
// Mirrors vugg-simulator's setup. Tests run under jsdom against the
// concatenated dist/ tsc output, so the simulator's classes are
// exercisable the same way the browser bundle would exercise them.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests-js/**/*.test.ts'],
    setupFiles: ['tests-js/setup.ts'],
    isolate: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
