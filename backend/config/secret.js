/* Single source of truth for the JWT signing secret.

   In production JWT_SECRET is MANDATORY — we refuse to boot without it rather than
   fall back to a hardcoded value. The old fallback lived in a public repo, so anyone
   could have forged tokens (including role:'admin'). In development only, a clearly
   labelled insecure secret is used so local runs work without extra setup. */
const secret =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret-do-not-use-in-prod');

if (!secret) {
  console.error('FATAL: JWT_SECRET environment variable is required in production.');
  process.exit(1);
}

module.exports = secret;
