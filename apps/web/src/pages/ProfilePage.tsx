import { changePasswordSchema, updateProfileSchema, type MeDto } from '@deadlinehero/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { TextField } from '../components/TextField';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { serverErrors, validate, type FieldErrors } from '../lib/form-errors';
import { useFx } from '../lib/fx';
import { formatDateTime } from '../lib/time';

function Section({ title, children, tone = 'gold' }: { title: string; children: ReactNode; tone?: 'gold' | 'blood' }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`panel p-5 ${tone === 'blood' ? 'border-blood/60' : ''}`}>
      <h2 id={id} className={`font-display text-lg font-bold ${tone === 'blood' ? 'text-blood' : 'text-gold'}`}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FormAlert({ errors, success }: { errors: FieldErrors; success?: string | null }) {
  if (errors.form) {
    return (
      <p role="alert" className="rounded-[3px] border-2 border-blood bg-blood/10 px-3 py-2 text-sm text-blood">
        {errors.form}
      </p>
    );
  }
  return success ? (
    <p role="status" className="rounded-[3px] border-2 border-heal/60 bg-heal/10 px-3 py-2 text-sm text-heal">
      ✓ {success}
    </p>
  ) : null;
}

function timezones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return all.includes(current) ? all : [current, ...all];
}

function ProfileForm({ me }: { me: MeDto }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ nickname: me.nickname, timezone: me.timezone });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => timezones(me.timezone), [me.timezone]);
  const tzId = useId();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSuccess(null);
    const changes = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => value !== me[key as keyof typeof values]),
    );
    if (Object.keys(changes).length === 0) return;
    const { data, errors: clientErrors } = validate(updateProfileSchema, changes);
    setErrors(clientErrors);
    if (!data) return;
    setSaving(true);
    try {
      queryClient.setQueryData(['me'], await api.updateProfile(data));
      setSuccess('Profilul a fost salvat.');
    } catch (error) {
      setErrors(serverErrors(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormAlert errors={errors} success={success} />
      <TextField label="Email" value={me.email} disabled hint="Emailul nu se poate schimba." />
      <TextField
        label="Poreclă"
        value={values.nickname}
        maxLength={20}
        error={errors.nickname}
        onChange={(e) => setValues({ ...values, nickname: e.target.value })}
      />
      <div className="space-y-1.5">
        <label htmlFor={tzId} className="block font-display text-xs font-bold tracking-wider text-muted uppercase">
          Fus orar
        </label>
        <select
          id={tzId}
          value={values.timezone}
          onChange={(e) => setValues({ ...values, timezone: e.target.value })}
          className="block min-h-11 w-full rounded-[3px] border-2 border-line bg-abyss/80 px-3 text-base text-ink outline-none focus:border-gold"
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted">Ziua de joc începe la 04:00 în acest fus orar (Stamina și ziua curată).</p>
      </div>
      <Button type="submit" loading={saving}>
        Salvează profilul
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSuccess(null);
    const { data, errors: clientErrors } = validate(changePasswordSchema, values);
    setErrors(clientErrors);
    if (!data) return;
    setSaving(true);
    try {
      await api.changePassword(data);
      setValues({ currentPassword: '', newPassword: '' });
      setSuccess('Parola a fost schimbată. Celelalte dispozitive au fost deconectate.');
    } catch (error) {
      setErrors(serverErrors(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormAlert errors={errors} success={success} />
      <TextField
        label="Parola actuală"
        type="password"
        autoComplete="current-password"
        value={values.currentPassword}
        error={errors.currentPassword}
        onChange={(e) => setValues({ ...values, currentPassword: e.target.value })}
      />
      <TextField
        label="Parola nouă"
        type="password"
        autoComplete="new-password"
        hint="Cel puțin 10 caractere."
        value={values.newPassword}
        error={errors.newPassword}
        onChange={(e) => setValues({ ...values, newPassword: e.target.value })}
      />
      <Button type="submit" variant="secondary" loading={saving}>
        Schimbă parola
      </Button>
    </form>
  );
}

function Appearance() {
  const { settings, setSettings } = useFx();
  const option = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-2 rounded-[3px] border-2 px-4 font-display text-sm font-bold tracking-wider uppercase ${
      active ? 'border-gold bg-gold/10 text-gold' : 'border-line text-muted hover:text-ink'
    }`;
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-display text-xs font-bold tracking-wider text-muted uppercase">Temă</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={option(settings.theme === 'dark')} aria-pressed={settings.theme === 'dark'} onClick={() => setSettings({ theme: 'dark' })}>
            ☾ Întunecată
          </button>
          <button type="button" className={option(settings.theme === 'light')} aria-pressed={settings.theme === 'light'} onClick={() => setSettings({ theme: 'light' })}>
            ☀ Deschisă
          </button>
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[#d9ab4a]" checked={settings.calm} onChange={(e) => setSettings({ calm: e.target.checked })} />
        <span>
          <strong>Mod calm</strong> <span className="text-muted">fără animații și fără sunete</span>
        </span>
      </label>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[#d9ab4a]" checked={settings.sound} onChange={(e) => setSettings({ sound: e.target.checked })} />
        <strong>Efecte sonore</strong>
      </label>
    </div>
  );
}

function DataExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deadlinehero-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Exportul a eșuat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-muted">
        Descarcă un fișier JSON cu profilul, activitățile, istoricul, registrul de recompense și participarea la Shared Quests.
      </p>
      {error && <p role="alert" className="text-sm text-blood">✖ {error}</p>}
      <Button variant="secondary" loading={busy} onClick={() => void download()}>
        ⤓ Exportă datele mele
      </Button>
    </div>
  );
}

function DeleteAccount() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setErrors({ password: 'Introduceți parola pentru confirmare' });
      return;
    }
    setBusy(true);
    try {
      await api.deleteAccount(password);
      await logout();
      navigate('/autentificare', { replace: true });
    } catch (error) {
      setErrors(serverErrors(error));
      setBusy(false);
    }
  }

  return (
    <>
      <p className="text-muted">
        Ștergerea e definitivă: activitățile, istoricul și progresul dispar. Dacă ești într-o echipă, ieși din ea (conducerea trece mai
        departe).
      </p>
      <Button variant="danger" className="mt-3" onClick={() => setOpen(true)}>
        Șterge contul
      </Button>
      <Modal open={open} title="Ștergi contul definitiv?" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <FormAlert errors={errors} />
          <p className="text-muted">Nu se poate anula. Confirmă cu parola ta.</p>
          <TextField
            label="Parola"
            type="password"
            autoComplete="current-password"
            value={password}
            error={errors.password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Renunță
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              Șterge definitiv
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ProfilePage({ initialUser }: { initialUser: MeDto }) {
  const { data: me = initialUser } = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser });
  const stats = [
    ['Nivel', me.level],
    ['XP total', me.xpTotal],
    ['Viață', `${me.hp} / ${me.hpMax}`],
    ['Aur', `◈ ${me.coins}`],
    ['Serie', `${me.streakDays} zile`],
  ] as const;

  return (
    <div className="min-h-screen pb-16">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="glow-gold font-display text-2xl font-bold text-gold">{me.nickname}</h1>
          <p className="mt-1 text-muted">Erou din {formatDateTime(me.createdAt)}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label} className="panel px-3 py-2 text-center">
              <dt className="font-display text-xs tracking-wider text-muted uppercase">{label}</dt>
              <dd className="font-display text-lg font-bold text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <Section title="Profil">
          <ProfileForm me={me} />
        </Section>
        <Section title="Aspect și accesibilitate">
          <Appearance />
        </Section>
        <Section title="Parolă">
          <PasswordForm />
        </Section>
        <Section title="Datele mele">
          <DataExport />
        </Section>
        <Section title="Zona periculoasă" tone="blood">
          <DeleteAccount />
        </Section>
      </main>
    </div>
  );
}
