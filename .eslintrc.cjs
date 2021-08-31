module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
  ],
  globals: {
    __API__: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    extraFileExtensions: ['.cjs'],
    project: './tsconfig.json',
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['**/*.tsx'],
      rules: {
        'react/prop-types': 'off',
      },
    },
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // node.js does not search for extensions outside node_modules
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'linebreak-style': 'off',
    'no-await-in-loop': 'off',
    'no-bitwise': 'off',
    'no-console': 'off',
    'no-continue': 'off',
    'no-param-reassign': ['error', { ignorePropertyModificationsFor: ['accum'] }],
    // Allow for-of loops
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
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
