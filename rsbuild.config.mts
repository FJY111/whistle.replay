import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const whistlePort = process.env.WHISTLE_PORT ?? '8899';
const whistleTarget = `http://127.0.0.1:${whistlePort}`;

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    favicon: './src/assets/logo.svg',
    title: 'Replay',
  },
  output: {
    assetPrefix: './',
    distPath: {
      root: 'public',
    },
  },
  server: {
    proxy: {
      '/cgi-bin': {
        changeOrigin: true,
        pathRewrite: { '^/cgi-bin': '/whistle.replay/cgi-bin' },
        target: whistleTarget,
      },
    },
    publicDir: false,
  },
});
