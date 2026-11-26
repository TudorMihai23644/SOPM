import { changePasswordSchema, updateProfileSchema, type MeDto, type UpdateProfileInput } from '@deadlinehero/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { Body, Button, Card, Field, FormError, Label, Loading, Notice, Screen, Title } from '../../src/components/ui';
import { api, fieldErrors } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { validate } from '../../src/lib/form';
import { formatDateTime } from '../../src/lib/time';
import { radius, space, TOUCH, useTheme } from '../../src/lib/theme';

function Section({ title, children, danger }: { title: string; children: ReactNode; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <Card tone={danger ? 'blood' : undefined}>
      <Text accessibilityRole="header" style={{ color: danger ? colors.blood : colors.gold, fontSize: 18, fontWeight: '800' }}>
        {title}
      </Text>
      {children}
    </Card>
  );
}

function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function ProfileForm({ me }: { me: MeDto }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ nickname: me.nickname, timezone: me.timezone });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const device = deviceTimezone();

  async function submit() {
    setSuccess(null);
    const changes: UpdateProfileInput = {};
    if (values.nickname !== me.nickname) changes.nickname = values.nickname;
    if (values.timezone !== me.timezone) changes.timezone = values.timezone;
    const { data, errors: clientErrors } = validate(updateProfileSchema, changes);
    setErrors(clientErrors);
    if (!data) return;
    setBusy(true);
    try {
      queryClient.setQueryData(['me'], await api.updateProfile(data));
      setSuccess('Profilul a fost salvat.');
    } catch (error) {
      setErrors(fieldErrors(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <FormError message={errors.form} />
      <Notice message={success} />
      <Field
        label="Poreclă"
        value={values.nickname}
        error={errors.nickname}
        autoCapitalize="none"
        maxLength={20}
        onChangeText={(nickname) => setValues({ ...values, nickname })}
      />
      <Field
        label="Fus orar"
        value={values.timezone}
        error={errors.timezone}
        autoCapitalize="none"
        autoCorrect={false}
        hint="Ziua de joc începe la 04:00 în acest fus orar."
        onChangeText={(timezone) => setValues({ ...values, timezone })}
      />
      {device && device !== values.timezone && (
        <Button title={`Folosește fusul telefonului (${device})`} variant="ghost" onPress={() => setValues({ ...values, timezone: device })} />
      )}
      <Button title="Salvează profilul" loading={busy} onPress={() => void submit()} />
    </>
  );
}

function Appearance() {
  const { colors, settings, setSettings } = useTheme();
  const themes = [
    { value: 'system', label: 'Ca sistemul' },
    { value: 'dark', label: '☾ Întunecată' },
    { value: 'light', label: '☀ Deschisă' },
  ] as const;
  return (
    <>
      <Label>Temă</Label>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {themes.map((t) => {
          const selected = settings.theme === t.value;
          return (
            <Pressable
              key={t.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setSettings({ theme: t.value })}
              style={{
                minHeight: TOUCH,
                paddingHorizontal: space.md,
                justifyContent: 'center',
                borderWidth: 2,
                borderRadius: radius.sm,
                borderColor: selected ? colors.gold : colors.line,
                backgroundColor: selected ? colors.panel2 : 'transparent',
              }}
            >
              <Text style={{ color: selected ? colors.gold : colors.muted, fontWeight: '700' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>Mod calm</Text>
          <Text style={{ color: colors.muted }}>Fără animații și fără vibrații.</Text>
        </View>
        <Switch
          accessibilityLabel="Mod calm"
          value={settings.calm}
          onValueChange={(calm) => setSettings({ calm })}
          trackColor={{ true: colors.gold, false: colors.line }}
          thumbColor={colors.panel}
        />
      </View>
    </>
  );
}

function PasswordForm() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setSuccess(null);
    const { data, errors: clientErrors } = validate(changePasswordSchema, values);
    setErrors(clientErrors);
    if (!data) return;
    setBusy(true);
    try {
      await api.changePassword(data);
      setValues({ currentPassword: '', newPassword: '' });
      setSuccess('Parola a fost schimbată. Celelalte dispozitive au fost deconectate.');
    } catch (error) {
      setErrors(fieldErrors(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <FormError message={errors.form} />
      <Notice message={success} />
      <Field
        label="Parola actuală"
        value={values.currentPassword}
        error={errors.currentPassword}
        secureTextEntry
        autoComplete="current-password"
        onChangeText={(currentPassword) => setValues({ ...values, currentPassword })}
      />
      <Field
        label="Parola nouă"
        value={values.newPassword}
        error={errors.newPassword}
        secureTextEntry
        autoComplete="new-password"
        hint="Cel puțin 10 caractere."
        onChangeText={(newPassword) => setValues({ ...values, newPassword })}
      />
      <Button title="Schimbă parola" variant="secondary" loading={busy} onPress={() => void submit()} />
    </>
  );
}

function DataExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.exportData();
      const file = new File(Paths.cache, `deadlinehero-export-${new Date().toISOString().slice(0, 10)}.json`);
      if (file.exists) file.delete();
      file.create();
      await file.write(JSON.stringify(data, null, 2));
      if (!(await Sharing.isAvailableAsync())) throw new Error('Partajarea nu este disponibilă pe acest dispozitiv.');
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exportă datele DeadlineHero', UTI: 'public.json' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Exportul a eșuat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Body muted>Un fișier JSON cu profilul, activitățile, istoricul, registrul de recompense și participarea la Shared Quests.</Body>
      <FormError message={error ?? undefined} />
      <Button title="⤓ Exportă datele mele" variant="secondary" loading={busy} onPress={() => void exportData()} />
    </>
  );
}

function DeleteAccount() {
  const { forget } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!password) {
      setErrors({ password: 'Introduceți parola pentru confirmare' });
      return;
    }
    setBusy(true);
    try {
      await api.deleteAccount(password);
      forget();
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields.form ? { password: fields.form } : fields);
      setBusy(false);
    }
  }

  return (
    <>
      <Body muted>
        Ștergerea e definitivă: activitățile, istoricul și progresul dispar. Dacă ești într-o echipă, ieși din ea (conducerea trece mai
        departe).
      </Body>
      {open ? (
        <>
          <Field
            label="Parola, pentru confirmare"
            value={password}
            error={errors.password}
            secureTextEntry
            autoFocus
            autoComplete="current-password"
            onChangeText={setPassword}
          />
          <Button title="Șterge definitiv" variant="danger" loading={busy} onPress={() => void confirm()} />
          <Button title="Renunță" variant="ghost" onPress={() => setOpen(false)} />
        </>
      ) : (
        <Button title="Șterge contul" variant="danger" onPress={() => setOpen(true)} />
      )}
    </>
  );
}

export default function ProfileScreen() {
  const { state, logout } = useAuth();
  const { colors } = useTheme();
  const initialUser = state.status === 'authenticated' ? state.user : undefined;
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser });

  if (!me) return <Loading />;

  const stats: [string, string | number][] = [
    ['Nivel', me.level],
    ['XP total', me.xpTotal],
    ['Viață', `${me.hp} / ${me.hpMax}`],
    ['Aur', `◈ ${me.coins}`],
    ['Serie', `${me.streakDays} zile`],
    ['Combo', `×${me.comboMultiplier.toFixed(2)}`],
  ];

  return (
    <Screen>
      <Title size={26}>{me.nickname}</Title>
      <Body muted>
        {me.email} · erou din {formatDateTime(me.createdAt)}
      </Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {stats.map(([label, value]) => (
          <View
            key={label}
            accessible
            accessibilityLabel={`${label}: ${value}`}
            style={{
              flexBasis: '31%',
              flexGrow: 1,
              borderWidth: 2,
              borderColor: colors.line,
              borderRadius: radius.md,
              backgroundColor: colors.panel,
              padding: space.sm,
            }}
          >
            <Label>{label}</Label>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
          </View>
        ))}
      </View>

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
      <Button
        title="Ieși din cont"
        variant="secondary"
        onPress={() =>
          Alert.alert('Ieși din cont?', 'Te poți autentifica din nou oricând.', [
            { text: 'Rămân', style: 'cancel' },
            { text: 'Ieși', onPress: () => void logout() },
          ])
        }
      />
      <Section title="Zona periculoasă" danger>
        <DeleteAccount />
      </Section>
    </Screen>
  );
}
