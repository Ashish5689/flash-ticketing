import { describe, expect, it } from 'vitest';

import { formatCountdown } from '../src/hooks/useCountdown';

describe('booking countdown formatting', () => {
  it('renders the five-minute hold and zero-pads seconds', () => {
    expect(formatCountdown(300)).toBe('5:00');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
});
