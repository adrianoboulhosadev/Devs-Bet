/**
 * Tests the pure settlement logic (wallet effect per bet outcome). The context
 * packages and shared resolve directly from source (no prior build).
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    '^shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@wallet/adapters$': '<rootDir>/../../packages/wallet/adapters/src/index.ts',
    '^@wallet/core$': '<rootDir>/../../packages/wallet/core/src/index.ts',
    '^@betting/adapters$': '<rootDir>/../../packages/betting/adapters/src/index.ts',
    '^@betting/core$': '<rootDir>/../../packages/betting/core/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
}
