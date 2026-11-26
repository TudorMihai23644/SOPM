import { forgotPasswordSchema, resetPasswordSchema } from '@deadlinehero/shared';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { api } from '../lib/api';
import { serverErrors, validate, type FieldErrors } from '../lib/form-errors';

function Alert({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="rounded-[3px] border-2 border-blood bg-blood/10 px-3 py-2 text-sm text-blood">
      {message}
    </p>
  ) : null;
}

const backToLogin = (
  <p className="mt-6 text-center text-sm text-muted">
    <Link to="/autentificare" className="font-bold text-gold hover:underline">
      ← Înapoi la autentificare
    </Link>
  </p>
);

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const { data, errors: clientErrors } = validate(forgotPasswordSchema, { email });
    setErrors(clientErrors);
    if (!data) return;
    setBusy(true);
    try {
      await api.forgotPassword(data);
      setSent(true);
    } catch (error) {
      setErrors(serverErrors(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Ai uitat parola?" subtitle="Îți trimitem un link de resetare, valabil 30 de minute.">
      {sent ? (
        <p role="status" className="text-center">
          Dacă există un cont cu adresa <strong>{email}</strong>, linkul de resetare e pe drum. Verifică și folderul Spam.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Alert message={errors.form} />
          <TextField label="Email" type="email" autoComplete="email" value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" loading={busy}>
            Trimite linkul
          </Button>
        </form>
      )}
      {backToLogin}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const { data, errors: clientErrors } = validate(resetPasswordSchema, { token, newPassword });
    setErrors(clientErrors.token ? { form: clientErrors.token } : clientErrors);
    if (!data) return;
    setBusy(true);
    try {
      await api.resetPassword(data);
      setDone(true);
    } catch (error) {
      setErrors(serverErrors(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Parolă nouă" subtitle="Alege o parolă de cel puțin 10 caractere.">
      {done ? (
        <div role="status" className="space-y-4 text-center">
          <p>Parola a fost schimbată. Toate sesiunile vechi au fost închise.</p>
          <Link to="/autentificare" className="font-bold text-gold hover:underline">
            Intră în cont →
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Alert message={errors.form ?? (token ? undefined : 'Linkul de resetare nu este valid.')} />
          <TextField
            label="Parola nouă"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            error={errors.newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" loading={busy} disabled={!token}>
            Salvează parola
          </Button>
        </form>
      )}
      {!done && backToLogin}
    </AuthLayout>
  );
}
