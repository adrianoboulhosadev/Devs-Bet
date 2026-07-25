import { SelfExclusion } from '../src'

test('a 24h self-exclusion is active until the period passes', () => {
  const exclusion = SelfExclusion.start('u1', '24h')
  expect(exclusion.isActive).toBe(true)
  expect(exclusion.until).not.toBeNull()
  expect(exclusion.until!.getTime()).toBeGreaterThan(Date.now())
})

test('a permanent self-exclusion has no end date and is always active', () => {
  const exclusion = SelfExclusion.start('u1', 'permanent')
  expect(exclusion.until).toBeNull()
  expect(exclusion.isActive).toBe(true)
})

test('an expired self-exclusion is no longer active', () => {
  const exclusion = new SelfExclusion({
    userId: 'u1',
    period: '24h',
    startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    until: new Date(Date.now() - 1000), // already past
  })
  expect(exclusion.isActive).toBe(false)
})
