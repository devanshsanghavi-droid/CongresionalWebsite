/**
 * The daylight-saving tests only mean something if the clock really is a
 * daylight-saving clock. vitest.config.ts pins TZ to America/Los_Angeles; this
 * proves the pin took, so nobody can "fix" a failing DST test by running in UTC.
 */
import { describe, expect, it } from 'vitest';

describe('test timezone', () => {
  it('is Los Angeles, with the November 1, 2026 change in it', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');
    const before = new Date(2026, 9, 31, 12).getTimezoneOffset();
    const after = new Date(2026, 10, 2, 12).getTimezoneOffset();
    expect(before).toBe(420); // PDT, UTC-7
    expect(after).toBe(480); // PST, UTC-8
  });
});
