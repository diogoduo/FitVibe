const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Migrações do Drizzle (src/db/migrations/*.sql), embutidas pelo babel-plugin-inline-import.
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './src/global.css' });
