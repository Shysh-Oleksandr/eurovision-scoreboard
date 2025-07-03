import { resolve } from 'path';

import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const { name } = assetInfo;

          if (!name) return '[name][extname]';

          // Handle fonts
          if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
            return 'fonts/[name][extname]';
          }

          // Handle other assets
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/.test(name)) {
            return 'img/[name][extname]';
          }

          return '[name][extname]';
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  define: {
    'process.env.name': JSON.stringify('DouzePoints'),
  },
});
