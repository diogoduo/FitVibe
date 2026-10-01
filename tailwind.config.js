const { palette, toRgbChannels } = require('./src/theme/palette');

const tokens = Object.keys(palette.dark);

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
    ({ addBase }) =>
      addBase({
        ':root': Object.fromEntries(
          tokens.map((token) => [`--color-${token}`, toRgbChannels(palette.dark[token])]),
        ),
      }),
  ],
};
