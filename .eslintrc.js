module.exports = {
  parser: 'babel-eslint',
  extends: 'standard',
  plugins: ['mocha'],
  parserOptions: {
    'ecmaVersion':2017
  },
  env: {'mocha': true},
  rules: {
    'space-before-function-paren': ['error', 'never'],
    'no-underscore-dangle': 0,
    'mocha/no-exclusive-tests': 'error'
  }
}
