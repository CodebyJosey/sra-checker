/**
 * @summary Next.js middleware — beschermt routes door checken op een sessie-cookie.
 *
 * @remarks
 * Omdat middleware in de Edge runtime draait kan hier niet rechtstreeks
 * Prisma worden aangesproken. We checken alleen of de session-cookie
 * van BetterAuth aanwezig is. Het echte ownership-check (klopt deze
 * sessie écht, en is het de eigenaar van het gevraagde document?) doen
 * we *altijd* nogmaals in de route zelf met de Node-runtime.
 *
 * Defense in depth: een ontbrekende cookie geeft hier al een redirect,
 * een geldige cookie wordt later aan de server-side opnieuw gevalideerd.
 */
import { NextResponse, type NextRequest } from 'next/server';
 
const COOKIE_NAME = 'sra-checker.session_token';
const PUBLIC_PATHS = ['/login', '/register', '/'];
 
export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
 
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }
 
  const sessionCookie = req.cookies.get(COOKIE_NAME);
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
 
  return NextResponse.next();
}
 
export const config = {
  matcher: [
    // Alles behalve assets, _next, en de auth-API.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
 