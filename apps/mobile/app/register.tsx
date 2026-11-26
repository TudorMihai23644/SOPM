import { registerSchema } from '@deadlinehero/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Body, Button, Card, Field, FormError, Screen, Title } from '../src/components/ui';
import { fieldErrors } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { validate } from '../src/lib/form';

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Bucharest';
  } catch {
    return 'Europe/Bucharest';
  }
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [values, setValues] = useState({ email: '', nickname: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const payload = { ...values, timezone: deviceTimezone() };
    const { data, errors: clientErrors } = validate(registerSchema, payload);
    setErrors(clientErrors);
    if (!data) return;
    setBusy(true);
    try {
      await register(payload);
    } catch (error) {
      setErrors(fieldErrors(error));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <Title size={26}>Un erou nou</Title>
        <Body muted>Primești 100 HP și pornești de la nivelul 1.</Body>
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
            label="Poreclă"
            value={values.nickname}
            error={errors.nickname}
            autoCapitalize="none"
            maxLength={20}
            hint="3–20 caractere: litere, cifre și . _ -"
            onChangeText={(nickname) => setValues({ ...values, nickname })}
          />
          <Field
            label="Parolă"
            value={values.password}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
            hint="Cel puțin 10 caractere."
            onChangeText={(password) => setValues({ ...values, password })}
          />
          <Button title="Creează contul" loading={busy} onPress={() => void submit()} />
        </Card>
        <Button title="Am deja cont" variant="ghost" onPress={() => router.back()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
