import type { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="pixel animate-blink mt-4 text-[10px] text-gold">— INSERT COIN —</p>
          <h1 className="pixel mt-6 text-base text-ink sm:text-lg">{title}</h1>
          <p className="mt-3 text-muted">{subtitle}</p>
        </div>
        <div className="panel p-6">{children}</div>
      </div>
    </main>
  );
}
