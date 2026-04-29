'use client';
 
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/infrastructure/auth/auth-client';
 
export default function RegisterPage() {
  const router = useRouter();
 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
 
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: authError } = await signUp.email({ name, email, password });
    setPending(false);
    if (authError) {
      setError(authError.message ?? 'Registratie mislukt');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }
 
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Account aanmaken</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Al een account?{' '}
        <Link href="/login" className="text-[var(--foreground)] underline underline-offset-4">
          Inloggen
        </Link>
      </p>
 
      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Naam
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm shadow-sm focus:border-[var(--foreground)] focus:outline-none"
          />
        </div>
 
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm shadow-sm focus:border-[var(--foreground)] focus:outline-none"
          />
        </div>
 
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm shadow-sm focus:border-[var(--foreground)] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Minimaal 10 tekens.</p>
        </div>
 
        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
 
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Bezig…' : 'Account aanmaken'}
        </button>
      </form>
    </>
  );
}
 