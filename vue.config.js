const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    client: {
      webSocketURL: {
        protocol: 'wss',
        hostname: 'stunning-broccoli-pjpvw96rpp6pc9w7-8080.app.github.dev', // your codespace hostname
        port: 443,
        pathname: '/ws',
      },
    },
  },
});
