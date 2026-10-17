import { expect, test } from 'claude-code/testing'

import { bar, line, until } from './register'

const NOW = Date.parse('2026-10-17T08:00:00Z')

test('draws context, both plan windows with resets, and today', () => {
  const out = line(
    {
      context: { window: 200_000, tokens: 62_000, percent: 31 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 22, resetsAt: '2026-10-17T10:10:00Z' },
        { kind: 'seven_day', percentUsed: 91, resetsAt: '2026-10-21T11:00:00Z' },
      ],
      cost: { usd: 1.1 },
    },
    NOW,
    3.2,
  )

  expect(out).toBe(
    '🟢 ctx ▰▰▰▱▱▱▱▱▱▱ 31% 62k/200k  │  🟢 5h ▰▰▱▱▱▱▱▱▱▱ 22% ↻2h10m  │  🔴 week ▰▰▰▰▰▰▰▰▰▱ 91% ↻4d3h  │  today $3.20',
  )
})

test('shows dashes off a subscription and before the first reading', () => {
  expect(line({ context: { window: 1_000_000 }, rateLimits: [] }, NOW, undefined)).toBe(
    'ctx —/1.0M  │  5h —  │  week —',
  )
})

test('clamps bars and handles past resets', () => {
  expect(bar(140)).toBe('▰▰▰▰▰▰▰▰▰▰')
  expect(until('2026-10-17T07:00:00Z', NOW)).toBe('now')
})

test('honours a custom bar width, including none', () => {
  const u = { context: { window: 200_000, percent: 50 }, rateLimits: [] }
  expect(line(u, NOW, undefined, 4)).toBe('🟢 ctx ▰▰▱▱ 50%  │  5h —  │  week —')
  expect(line(u, NOW, undefined, 0)).toBe('🟢 ctx  50%  │  5h —  │  week —')
})
