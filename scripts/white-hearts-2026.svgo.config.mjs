// svgo config for scripts/white-hearts-2026.mjs. The viewBox must stay: the
// hearts are scaled by CSS in <img>, which needs it.
export default {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: { overrides: { removeViewBox: false } },
    },
  ],
};
