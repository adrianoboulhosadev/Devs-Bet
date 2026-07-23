/**
 * Tests the (rich) betting core: Bet invariants, the parimutuel PayoutCalculator,
 * the OddsCalculator and the use cases. `shared` resolves from source.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    '^shared$': '<rootDir>/../../shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
}
