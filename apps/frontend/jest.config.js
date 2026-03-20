module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^jest-preset-angular/(.*)$': '<rootDir>/../../node_modules/jest-preset-angular/$1',
  },
};
