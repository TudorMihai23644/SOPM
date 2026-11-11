import { DEFAULT_TIMEZONE, loginSchema, registerSchema } from '../src/schemas';

const valid = { email: ' Ana@Example.COM ', password: 'parola-lunga-1', nickname: 'ana_99' };

describe('registerSchema', () => {
  it('normalizează emailul și pune fusul orar implicit', () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe('ana@example.com');
    expect(result.timezone).toBe(DEFAULT_TIMEZONE);
  });

  it('respinge o parolă sub 10 caractere', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'scurta' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['password']);
  });

  it('respinge un email invalid', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'nu-e-email' }).success).toBe(false);
  });

  it('respinge porecle cu caractere nepermise sau prea scurte', () => {
    expect(registerSchema.safeParse({ ...valid, nickname: 'a b' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, nickname: 'ab' }).success).toBe(false);
  });

  it('respinge un fus orar necunoscut', () => {
    expect(registerSchema.safeParse({ ...valid, timezone: 'Marte/Olympus' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('cere parola', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: '' }).success).toBe(false);
  });
});
