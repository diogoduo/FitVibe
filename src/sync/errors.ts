/** Mensagens de erro do servidor (login, rede) em português. Sem dependências do app. */
const AUTH_ERRORS: [RegExp, string | ((match: RegExpExecArray) => string)][] = [
  // "For security purposes, you can only request this after 45 seconds."
  [
    /only request this after (\d+) seconds?/i,
    (match) => `Espere ${match[1]} segundos para pedir outro e-mail.`,
  ],
  [/invalid login credentials/i, 'E-mail ou senha errados.'],
  [/already registered|already exists/i, 'Já existe uma conta com este e-mail. Use "Entrar".'],
  [/password should be at least|weak password/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/invalid.*email|unable to validate email/i, 'E-mail inválido.'],
  [/email not confirmed/i, 'Confirme o e-mail antes de entrar.'],
  [
    /rate limit|too many requests/i,
    'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.',
  ],
  [
    /network request failed|failed to fetch|fetch failed|timed out/i,
    'Sem conexão com o servidor. Confira a internet e tente de novo.',
  ],
];

export function friendlyError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error != null && 'message' in error
        ? String(error.message)
        : String(error);
  for (const [pattern, friendly] of AUTH_ERRORS) {
    const match = pattern.exec(message);
    if (match) return typeof friendly === 'string' ? friendly : friendly(match);
  }
  return message;
}
