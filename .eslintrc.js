module.exports = {
  "env": {
    "browser": true,
    "node": true,
  },
  "extends": "airbnb",
  "globals": {
    "__API__": true,
  },
  "parser": "babel-eslint",
  "rules": {
    "camelcase": ["error", { allow: ["len_m"] }],
    "linebreak-style": "off",
    "no-param-reassign" : ["error" , { ignorePropertyModificationsFor : ["accum"] }],
    "one-var": "off",
    "one-var-declaration-per-line": "off",
    "react/forbid-foreign-prop-types": "off",
    "react/no-array-index-key": "off",
  },
};
