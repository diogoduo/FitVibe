const { palette, toRgbChannels } = require('./src/theme/palette');

const tokens = Object.keys(palette.dark);

const toVars = (scheme) =>
  Object.fromEntries(
    tokens.map((token) => [`--color-${token}`, toRgbChannels(palette[scheme][token])]),
  );

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(
        tokens.map((token) => [token, `rgb(var(--color-${token}) / <alpha-value>)`]),
      ),
    },
  },
  plugins: [
    // As duas paletas como variáveis: o NativeWind escolhe pelo modo claro/escuro do app
    // (src/theme/theme.tsx força o modo com Appearance.setColorScheme).
    ({ addBase }) =>
      addBase({
        ':root': toVars('light'),
        '@media (prefers-color-scheme: dark)': { ':root': toVars('dark') },
      }),
  ],
};
