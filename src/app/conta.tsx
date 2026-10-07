import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { askConflict } from '@/features/account/conflict';
import { getProfile } from '@/features/profile/queries';
import { resendConfirmation, signIn, signUp, type AccountResult } from '@/sync/account';
import { supabase } from '@/sync/supabase';

type Mode = 'signIn' | 'signUp';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

/**
 * Entrar ou criar conta. Abre dos Ajustes (com perfil) ou do cadastro ("Já tenho conta"),
 * por isso fica fora das guardas do _layout.
 */
export default function AccountScreen() {
  const [hadProfile] = useState(() => getProfile() != null);
  const [mode, setMode] = useState<Mode>(hadProfile ? 'signUp' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Conta criada (ou login) esperando o link do e-mail.
  const [pending, setPending] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const emailError = EMAIL.test(email.trim()) ? undefined : 'Digite um e-mail válido.';
  const passwordError =
    password.length >= MIN_PASSWORD ? undefined : `Pelo menos ${MIN_PASSWORD} caracteres.`;

  // Com perfil baixado da conta, o cadastro some (guarda do _layout): volta para as abas.
  const leave = () => {
    if (getProfile() == null) router.back();
    else router.dismissTo(hadProfile ? '/ajustes' : '/');
  };

  const finish = async (result: AccountResult | null) => {
    if (result == null) {
      setBusy(null);
      return;
    }
    if (result.status === 'ready') {
      setBusy(null);
      leave();
      return;
    }
    if (result.status === 'error') {
      setBusy(null);
      setError(result.message);
      return;
    }
    if (result.status === 'confirm') {
      setBusy(null);
      setPending(result.email);
      setMode('signIn');
      return;
    }
    await finish(await askConflict(result, () => setBusy('Baixando os dados da conta…')));
  };

  const submit = async (as: Mode = mode) => {
    if (emailError || passwordError) {
      setShowErrors(true);
      return;
    }
    setError(null);
    setBusy(as === 'signIn' ? 'Entrando…' : 'Criando a conta…');
    const action = as === 'signIn' ? signIn : signUp;
    await finish(await action(email, password));
  };

  const resend = async () => {
    if (!pending) return;
    setError(null);
    const failed = await resendConfirmation(pending);
    if (failed) setError(failed);
    else setResent(true);
  };

  if (!supabase) {
    return (
      <FormScroll>
        <Stack.Screen options={{ title: 'Conta' }} />
        <Text className="text-base leading-6 text-fg-muted">
          O servidor não está configurado neste app (veja o cartão Servidor nos Ajustes).
        </Text>
      </FormScroll>
    );
  }

  if (pending) {
    return (
      <FormScroll>
        <Stack.Screen options={{ title: 'Confirme o e-mail' }} />
        <Card icon="info" title="Falta confirmar">
          <Text className="text-base leading-6 text-fg">
            Enviamos um link para <Text className="font-semibold">{pending}</Text>. Abra o e-mail
            (pode estar no spam ou em Promoções), toque no link e volte aqui.
          </Text>
          {resent ? (
            <Text className="text-sm text-success">
              Enviamos de novo. Confira a caixa de entrada.
            </Text>
          ) : null}
        </Card>
        {error ? <Text className="text-base leading-6 text-danger">{error}</Text> : null}
        {busy ? (
          <View className="flex-row items-center justify-center gap-3 py-3.5">
            <Spinner />
            <Text className="text-base text-fg">{busy}</Text>
          </View>
        ) : (
          <View className="gap-3">
            <Button label="Já confirmei, entrar" onPress={() => void submit('signIn')} />
            <Button
              label="Reenviar o e-mail"
              variant="secondary"
              disabled={resent}
              onPress={() => void resend()}
            />
            <Button
              label="Usar outro e-mail"
              variant="secondary"
              onPress={() => {
                setPending(null);
                setResent(false);
                setError(null);
              }}
            />
          </View>
        )}
      </FormScroll>
    );
  }

  return (
    <FormScroll>
      <Stack.Screen options={{ title: mode === 'signIn' ? 'Entrar' : 'Criar conta' }} />
      <Text className="text-base leading-6 text-fg-muted">
        {hadProfile
          ? 'Com a conta, uma cópia dos seus dados fica guardada no servidor: se trocar de celular, é só entrar que tudo volta. O app continua funcionando sem internet.'
          : 'Já usa o app em outro celular? Entre na mesma conta e seus dados vêm para este.'}
      </Text>

      <ChoiceChips
        options={[
          { value: 'signIn', label: 'Entrar' },
          { value: 'signUp', label: 'Criar conta' },
        ]}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError(null);
        }}
      />

      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        editable={busy == null}
        error={showErrors ? emailError : undefined}
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
        textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        editable={busy == null}
        error={showErrors ? passwordError : undefined}
        hint={mode === 'signUp' ? `Pelo menos ${MIN_PASSWORD} caracteres.` : undefined}
      />

      {error ? <Text className="text-base leading-6 text-danger">{error}</Text> : null}

      {busy ? (
        <View className="flex-row items-center justify-center gap-3 py-3.5">
          <Spinner />
          <Text className="text-base text-fg">{busy}</Text>
        </View>
      ) : (
        <Button
          label={mode === 'signIn' ? 'Entrar' : 'Criar conta'}
          onPress={() => void submit()}
        />
      )}
    </FormScroll>
  );
}
