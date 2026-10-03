/** Mensagens de erro do servidor (login, rede) em português. Sem dependências do app. */
const AUTH_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha errados.'],
  [/already registered|already exists/i, 'Já existe uma conta com este e-mail. Use "Entrar".'],
  [/password should be at least|weak password/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/invalid.*email|unable to validate email/i, 'E-mail inválido.'],
  [/email not confirmed/i, 'Confirme o e-mail antes de entrar.'],
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
  return AUTH_ERRORS.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}
