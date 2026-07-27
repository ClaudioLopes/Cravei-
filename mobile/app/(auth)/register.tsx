import { useState } from 'react';
import { View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/context/auth-context';
import { Button, ErrorText, Field, Screen, Subtitle, Title } from '../../src/components/ui';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await register(nome.trim(), email.trim(), senha);
      router.replace('/(app)/groups');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível criar sua conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Criar conta</Title>
      <Subtitle>Leva menos de um minuto.</Subtitle>

      <View style={{ gap: 12 }}>
        <Field label="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome" />
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
          placeholder="mínimo 6 caracteres"
        />
        <ErrorText>{error}</ErrorText>
        <Button label="Criar conta" onPress={handleSubmit} loading={loading} />
        <Link href="/(auth)/login" asChild>
          <Button label="Já tenho conta" onPress={() => {}} variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}
