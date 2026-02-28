module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/auth.test.sh', '/client/'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'lib/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true
};
