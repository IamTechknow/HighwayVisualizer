module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: ['airbnb-typescript'],
  globals: {
    __API__: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    project: './tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'linebreak-style': 'off',
    'no-param-reassign': ['error', { ignorePropertyModificationsFor: ['accum'] }],
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'one-var': 'off',
    'one-var-declaration-per-line': 'off',
    // eslint default
    'operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }],
    'react/no-array-index-key': 'off',
    // default parameters are used, also defaultProps will be decrepated eventually
    'react/require-default-props': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    // allow underscore for functions that should be considered private
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
    ],
  },
};
