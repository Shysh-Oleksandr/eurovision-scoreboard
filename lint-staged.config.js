module.exports = {
  '*.{ts,tsx}': [
    () => 'yarn lint:types-cli',
    'prettier --write',
    'eslint --cache --fix --max-warnings=0',
  ],
};
