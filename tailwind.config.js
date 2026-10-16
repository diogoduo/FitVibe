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
      // Escala de texto do iOS no tamanho "Médio" do Dynamic Type (um passo abaixo do padrão, que
      // achamos grande demais no app), em pt, com a entrelinha de cada estilo. Sem tracking
      // manual: a fonte do sistema já ajusta o espaçamento pelo tamanho.
      fontSize: {
        xs: ['11px', { lineHeight: '14px' }], // Caption 1
        footnote: ['12px', { lineHeight: '16px' }], // Footnote: rótulos de seção
        sm: ['14px', { lineHeight: '19px' }], // Subheadline
        base: ['16px', { lineHeight: '21px' }], // Body / Headline
        lg: ['19px', { lineHeight: '24px' }], // Title 3
        xl: ['21px', { lineHeight: '26px' }], // Title 2
        '2xl': ['27px', { lineHeight: '33px' }], // Title 1
        '3xl': ['33px', { lineHeight: '40px' }], // Large Title
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
