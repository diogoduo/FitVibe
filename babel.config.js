module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Embute as migrações .sql do Drizzle como texto no bundle (src/db/migrations).
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
