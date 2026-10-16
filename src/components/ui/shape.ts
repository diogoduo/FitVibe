/**
 * Cantos contínuos (o "squircle" do iOS): a curva começa antes e chega ao reto sem quina,
 * como nos ícones e cartões do sistema. Vai em `style` porque o NativeWind não tem classe para
 * `borderCurve`; no Android não muda nada.
 *
 * Raios do app (tailwind.config.js): `rounded-card` (22) nas superfícies, com padding 16, e
 * `rounded-xl` (12) nos controles de dentro (botões, campos, linhas), para os cantos ficarem
 * concêntricos; `rounded-full` nas pílulas e círculos.
 */
export const continuous = { borderCurve: 'continuous' } as const;
