import { useState } from 'react';
import { View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/context/auth-context';
import { Button, ErrorText, Field, Screen, Subtitle, Title } from '../../src/components/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), senha);
      router.replace('/(app)/groups');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível entrar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Bolão do Brasileirão</Title>
      <Subtitle>Entre para acompanhar seus grupos e palpites.</Subtitle>

      <View style={{ gap: 12 }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@email.com"
        />
        <Field
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="••••••••"
        />
        <ErrorText>{error}</ErrorText>
        <Button label="Entrar" onPress={handleSubmit} loading={loading} />
        <Link href="/(auth)/register" asChild>
          <Button label="Criar uma conta" onPress={() => {}} variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}
