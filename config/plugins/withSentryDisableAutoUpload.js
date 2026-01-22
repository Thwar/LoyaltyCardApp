/**
 * Local Expo config plugin.
 *
 * This exists because the Expo config may reference
 * "./config/plugins/withSentryDisableAutoUpload".
 * If the file is missing, Expo fails during config resolution.
 */

function withSentryDisableAutoUpload(config) {
  return config;
}

module.exports = withSentryDisableAutoUpload;
module.exports.default = withSentryDisableAutoUpload;
