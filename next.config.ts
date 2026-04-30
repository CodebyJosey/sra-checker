import type { NextConfig } from 'next';
 
const securityHeaders = [
  // Geen embedding van onze pagina's in andere sites — voorkomt clickjacking.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Browser mag content-type niet zelf raden.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Stuur alleen origin door bij cross-origin navigatie.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Schakel browser-permissies uit die we niet gebruiken.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // HSTS — alleen relevant in productie achter HTTPS.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];
 
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
 
export default nextConfig;
 