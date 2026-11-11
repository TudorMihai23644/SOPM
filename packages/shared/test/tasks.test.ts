import { createTaskSchema, updateTaskSchema } from '../src/tasks';

const valid = { title: '  Tema la SOPM ', deadlineAt: '2026-12-01T18:00:00.000Z', difficulty: 'MEDIUM' };

describe('createTaskSchema', () => {
  it('acceptă o activitate validă și curăță titlul', () => {
    const result = createTaskSchema.parse({ ...valid, description: '' });
    expect(result.title).toBe('Tema la SOPM');
    expect(result.description).toBeNull();
  });

  it('cere titlu de 1–120 de caractere', () => {
    expect(createTaskSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...valid, title: 'x'.repeat(121) }).success).toBe(false);
  });

  it('cere o dată validă și o dificultate cunoscută', () => {
    expect(createTaskSchema.safeParse({ ...valid, deadlineAt: 'mâine' }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...valid, difficulty: 'EXTREM' }).success).toBe(false);
  });

  it('acceptă termene cu fus orar', () => {
    expect(createTaskSchema.safeParse({ ...valid, deadlineAt: '2026-12-01T20:00:00+02:00' }).success).toBe(true);
  });
});

describe('updateTaskSchema', () => {
  it('nu permite schimbarea dificultății', () => {
    expect(updateTaskSchema.safeParse({ difficulty: 'HARD' }).success).toBe(false);
  });

  it('cere cel puțin un câmp', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });
});
