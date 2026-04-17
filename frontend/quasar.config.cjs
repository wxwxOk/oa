/* eslint-env node */
const { configure } = require('quasar/wrappers');

module.exports = configure(function (/* ctx */) {
  return {
    boot: ['axios', 'perm'],
    store: true,
    css: ['app.scss'],
    extras: ['material-icons'],
    build: {
      target: { browser: ['es2022'], node: 'node20' },
      vueRouterMode: 'history',
      env: {
        API_BASE: '/api/v1',
      },
    },
    devServer: {
      port: 9000,
      open: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    framework: {
      config: {
        dark: 'auto',
        notify: { position: 'top', timeout: 2000 },
      },
      plugins: ['Notify', 'Dialog', 'LoadingBar'],
    },
    animations: [],
    ssr: { pwa: false },
    pwa: {},
    electron: {},
    bex: {},
  };
});
