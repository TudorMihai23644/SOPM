import { loginSchema } from '@deadlinehero/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../lib/auth';
import { serverErrors, validate, type FieldErrors } from '../lib/form-errors';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const { data, errors: clientErrors } = validate(loginSchema, values);
    setErrors(clientErrors);
    if (!data) return;
    setSubmitting(true);
    try {
      await login(data);
      navigate('/', { replace: true });
    } catch (error) {
      setErrors(serverErrors(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Întoarcerea eroului" subtitle="Intră în cont ca să-ți continui misiunile.">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        {errors.form && (
          <p role="alert" className="rounded-[3px] border-2 border-blood bg-blood/10 px-3 py-2 text-sm text-blood">
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
          label="Parolă"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Intră în joc
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Nu ai cont?{' '}
        <Link to="/inregistrare" className="font-bold text-gold hover:underline">
          Creează unul
        </Link>
      </p>
    </AuthLayout>
  );
}
