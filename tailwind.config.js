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
      // Escala de texto do iOS (Dynamic Type no tamanho padrão), em pt, com a entrelinha de cada
      // estilo. Sem tracking manual: a fonte do sistema já ajusta o espaçamento pelo tamanho.
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }], // Caption 1
        footnote: ['13px', { lineHeight: '18px' }], // Footnote: rótulos de seção
        sm: ['15px', { lineHeight: '20px' }], // Subheadline
        base: ['17px', { lineHeight: '22px' }], // Body / Headline
        lg: ['20px', { lineHeight: '25px' }], // Title 3
        xl: ['22px', { lineHeight: '28px' }], // Title 2
        '2xl': ['28px', { lineHeight: '34px' }], // Title 1
        '3xl': ['34px', { lineHeight: '41px' }], // Large Title
      },
      // Superfícies (cartões): 22 com padding 16; os controles de dentro usam rounded-xl (12).
      borderRadius: { card: '22px' },
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
