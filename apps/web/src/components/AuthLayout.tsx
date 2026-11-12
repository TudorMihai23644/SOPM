import type { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="ornament mt-4 w-full font-display text-xs tracking-[0.3em] text-muted uppercase">
            <span>Cronicile termenelor</span>
          </p>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
        </div>
        <div className="panel panel-ornate p-6">{children}</div>
      </div>
    </main>
  );
}
