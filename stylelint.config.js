module.exports = {
  extends: 'stylelint-config-standard',
  rules: {
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
        ],
      },
    ],
    'declaration-property-value-no-unknown': null,
  },
};
