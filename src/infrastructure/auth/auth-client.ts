/**
 * @summary Client-side BetterAuth-instantie voor gebruik in React-componenten.
 *
 * @remarks
 * Bevat helpers voor `signIn`, `signUp`, `signOut` en `useSession`. Deze file
 * mag wel vanuit client components worden geïmporteerd; hij praat via fetch
 * met de `/api/auth`-route.
 */
import { createAuthClient } from 'better-auth/react';
 
export const authClient = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
});
 
export const { signIn, signUp, signOut, useSession } = authClient;