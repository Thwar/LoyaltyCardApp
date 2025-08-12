const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure assets resolve correctly when the site is served from /web
  if (!config.output) config.output = {};
  config.output.publicPath = "/web/";

  // Also set devServer for local testing
  if (config.devServer) {
    config.devServer.historyApiFallback = true;
  }

  return config;
};
