/**
 * Which colour each of Carta's countdown tiers is drawn in. The same map as the
 * iPhone app's `TIER_TONE` (src/components/Countdown.tsx in the app), kept in
 * its own file so a Node test can check it without rendering anything.
 */

import type { CountdownTier } from '../carta/lib/urgency.ts';

export type Tone = 'green' | 'amber' | 'red' | 'neutral';

export const TONE: Readonly<Record<CountdownTier, Tone>> = {
  green: 'green',
  amber: 'amber',
  red: 'red',
  expired: 'neutral',
  none: 'neutral',
};
