import { forgotPasswordSchema } from '@deadlinehero/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Card, Field, FormError, Notice, Screen } from '../src/components/ui';
import { api, fieldErrors } from '../src/lib/api';
import { validate } from '../src/lib/form';

export default function ForgotScreen() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const { data, errors: clientErrors } = validate(forgotPasswordSchema, { email });
    setErrors(clientErrors);
    if (!data) return;
    setBusy(true);
    try {
      await api.forgotPassword(data.email);
      setSent(true);
    } catch (error) {
      setErrors(fieldErrors(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Body muted>Îți trimitem un link de resetare, valabil 30 de minute. Îl deschizi în browser și alegi o parolă nouă.</Body>
      {sent ? (
        <>
          <Notice message={`Dacă există un cont cu adresa ${email}, linkul e pe drum.`} />
          <Button title="Înapoi la autentificare" onPress={() => router.back()} />
        </>
      ) : (
        <Card>
          <FormError message={errors.form} />
          <Field
            label="Email"
            value={email}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
          />
          <Button title="Trimite linkul" loading={busy} onPress={() => void submit()} />
        </Card>
      )}
    </Screen>
  );
}
