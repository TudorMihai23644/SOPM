import { DEFAULT_TIMEZONE, registerSchema } from '@deadlinehero/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../lib/auth';
import { serverErrors, validate, type FieldErrors } from '../lib/form-errors';

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', nickname: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const { data, errors: clientErrors } = validate(registerSchema, { ...values, timezone: browserTimezone() });
    setErrors(clientErrors);
    if (!data) return;
    setSubmitting(true);
    try {
      await register(data);
      navigate('/', { replace: true });
    } catch (error) {
      setErrors(serverErrors(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="JOC NOU" subtitle="Termină misiunile la timp, câștigă XP și monede, nu-ți pierde HP-ul.">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        {errors.form && (
          <p role="alert" className="rounded-md border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
            {errors.form}
          </p>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
        />
        <TextField
          label="Poreclă"
          autoComplete="username"
          hint="3–20 caractere: litere, cifre și . _ -"
          value={values.nickname}
          error={errors.nickname}
          onChange={(e) => setValues({ ...values, nickname: e.target.value })}
        />
        <TextField
          label="Parolă"
          type="password"
          autoComplete="new-password"
          hint="Cel puțin 10 caractere"
          value={values.password}
          error={errors.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Creează eroul
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Ai deja cont?{' '}
        <Link to="/autentificare" className="font-bold text-cyan uppercase hover:underline">
          Intră în cont
        </Link>
      </p>
    </AuthLayout>
  );
}
