import { loginSchema } from '@deadlinehero/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Body, Button, Card, Field, FormError, Screen, Title } from '../src/components/ui';
import { fieldErrors } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { validate } from '../src/lib/form';
import { space } from '../src/lib/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const { data, errors: clientErrors } = validate(loginSchema, values);
    setErrors(clientErrors);
    if (!data) return;
    setBusy(true);
    try {
      await login(values);
    } catch (error) {
      setErrors(fieldErrors(error));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <Text importantForAccessibility="no" style={{ fontSize: 56, textAlign: 'center', marginTop: space.xl }}>
          ⚔
        </Text>
        <Title size={30}>DeadlineHero</Title>
        <Body muted>Termenele tale devin misiuni. Termină-le la timp ca să câștigi experiență și aur.</Body>
        <Card>
          <FormError message={errors.form} />
          <Field
            label="Email"
            value={values.email}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            onChangeText={(email) => setValues({ ...values, email })}
          />
          <Field
            label="Parolă"
            value={values.password}
            error={errors.password}
            secureTextEntry
            autoComplete="current-password"
            onChangeText={(password) => setValues({ ...values, password })}
            onSubmitEditing={() => void submit()}
          />
          <Button title="Intră în joc" loading={busy} onPress={() => void submit()} />
          <Button title="Ai uitat parola?" variant="ghost" onPress={() => router.push('/forgot')} />
        </Card>
        <Button title="Creează un cont nou" variant="secondary" onPress={() => router.push('/register')} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
