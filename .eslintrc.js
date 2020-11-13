module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: ['plugin:@typescript-eslint/recommended'],
  globals: {
    __API__: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    camelcase: ['error', { allow: ['len_m'] }],
    'linebreak-style': 'off',
    'no-param-reassign': ['error', { ignorePropertyModificationsFor: ['accum'] }],
    'one-var': 'off',
    'one-var-declaration-per-line': 'off',
    'react/no-array-index-key': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
  },
};
