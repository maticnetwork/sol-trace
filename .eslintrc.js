module.exports = {
  parser: 'babel-eslint',
  extends: 'standard',
  plugins: ['mocha', 'chai-friendly'],
  parserOptions: {
    'ecmaVersion':2017
  },
  env: {'mocha': true},
  rules: {
    'space-before-function-paren': ['error', 'never'],
    'no-underscore-dangle': 0,
    'mocha/no-exclusive-tests': 'error',
    "no-unused-expressions": 0,
    "chai-friendly/no-unused-expressions": 2
  }
}
