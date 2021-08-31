export default {
  roots: [
    '<rootDir>/client',
  ],
  setupFiles: [
    '<rootDir>/client/setupTests.js',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js?$': 'babel-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  modulePathIgnorePatterns: ['__tests__/utils'],
  verbose: true,
  snapshotSerializers: ['enzyme-to-json/serializer'],
  testEnvironment: 'jsdom',
};
