module.exports = {
  '*.{ts,tsx}': [
    () => 'yarn lint:types-cli',
    'prettier --write',
    'eslint --cache --fix --max-warnings=0',
  ],
  // A translation edit must ship with a regenerated catalog manifest, or the
  // hashed static catalogs go stale (messagesManifest.test.ts also guards).
  'messages/*.json': [
    () => 'yarn gen:messages',
    () => 'git add src/i18n/messagesManifest.generated.ts',
  ],
};
