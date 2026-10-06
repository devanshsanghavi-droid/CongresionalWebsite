import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Pinned so the daylight-saving tests mean something on every machine,
    // including CI (Ubuntu, UTC by default). tests/timezone.test.ts proves the
    // pin took effect, so a "fix" that switches to UTC cannot pass quietly.
    env: { TZ: 'America/Los_Angeles' },
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
