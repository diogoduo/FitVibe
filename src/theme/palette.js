/**
 * Paleta do app: fonte única das cores.
 *
 * O Tailwind (tailwind.config.js) transforma cada cor em uma variável CSS, então as
 * classes (`bg-surface`, `text-fg-muted`...) seguem o tema ativo. O código TS importa
 * os hex direto só onde o NativeWind não alcança (tab bar nativa, tema do router).
 *
 * O escuro é o padrão do app; o claro (Ajustes → Aparência) vem das variáveis de
 * `prefers-color-scheme` e o app força o modo com Appearance.setColorScheme
 * em src/theme/theme.tsx. No código TS, use `useColors()` em vez de importar a paleta.
 * Fica em .js (CommonJS) porque o tailwind.config.js também precisa ler este arquivo.
 */
const palette = {
  dark: {
    background: '#0B0B0F',
    surface: '#16161C',
    'surface-2': '#1F1F27',
    line: '#2A2A35',
    fg: '#F4F4F6',
    'fg-muted': '#A1A1AD',
    primary: '#A3E635',
    'on-primary': '#0B0B0F',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    // Anéis do Hoje: proteína e água.
    protein: '#FB923C',
    water: '#38BDF8',
  },
  light: {
    background: '#F6F6F8',
    surface: '#FFFFFF',
    'surface-2': '#EDEDF1',
    line: '#D9D9E0',
    fg: '#111114',
    'fg-muted': '#5C5C68',
    primary: '#4D7C0F',
    'on-primary': '#FFFFFF',
    success: '#15803D',
    warning: '#B45309',
    danger: '#DC2626',
    protein: '#EA580C',
    water: '#0284C7',
  },
};

/** '#A3E635' → '163 230 53' (formato que o Tailwind usa com `<alpha-value>`). */
function toRgbChannels(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].join(' ');
}

module.exports = { palette, toRgbChannels };
