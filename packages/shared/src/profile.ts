import { z } from 'zod';
import { emailSchema, nicknameSchema, passwordSchema, timezoneSchema } from './schemas';

export const updateProfileSchema = z
  .strictObject(
    {
      nickname: nicknameSchema.optional(),
      timezone: timezoneSchema.optional(),
    },
    { error: 'Câmp necunoscut sau care nu se poate modifica' },
  )
  .refine((value) => Object.keys(value).length > 0, { error: 'Nimic de modificat' });
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'Introduceți parola actuală' }),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, { error: 'Introduceți parola pentru confirmare' }),
});
export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20, { error: 'Linkul de resetare nu este valid' }).max(200),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

/** Antetul prin care aplicația mobilă cere refresh token-ul în corpul răspunsului (nu are cookie-uri). */
export const CLIENT_HEADER = 'x-client';
export const MOBILE_CLIENT = 'mobile';

export const refreshBodySchema = z.object({ refreshToken: z.string().min(1).max(200).optional() }).optional();
