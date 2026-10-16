const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Migrações do Drizzle (src/db/migrations/*.sql), embutidas pelo babel-plugin-inline-import.
config.resolver.sourceExts.push('sql');

// 1rem = 16 (o padrão do NativeWind no celular é 14): espaçamentos na grade de 4 pt, margens de
// 16 como no iOS. Os tamanhos de texto são fixos em pt (escala do iOS, tailwind.config.js).
module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: 16 });
