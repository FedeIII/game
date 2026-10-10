import { createHash, randomBytes } from 'node:crypto';

/**
 * Sign-in with Google: OpenID Connect, the authorization code flow with PKCE. The server sends the
 * browser to Google with a random `state` (kept in the database and in a cookie of that browser)
 * and a PKCE challenge. Google sends the browser back with a code; the server trades the code
 * (with its client secret and the PKCE verifier) for an ID token, straight from Google over TLS.
 * Thus the token needs no signature check (OpenID Connect Core 1.0, 3.1.3.7); the server checks
 * its issuer, its audience and its expiry.
 *
 * The scope is `openid email`: the token gives the Google account id (`sub`) and the email, but no
 * name or picture. The game keeps the id and a verified email: the email tells who is an admin
 * (ADMIN_EMAILS). See apps/game/privacy/.
 */

export interface GoogleConfig {
  readonly clientId: string;
  readonly clientSecret: string;
}

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
/** Clock skew that the expiry check allows. */
const SKEW_MS = 60_000;

/** A new sign-in: the state, and the PKCE verifier and its challenge. */
export function newLogin(): { state: string; verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  return {
    state: randomBytes(18).toString('base64url'),
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  };
}

/** The page of Google where the visitor chooses an account. */
export function googleAuthUrl(config: GoogleConfig, redirectUri: string, state: string, challenge: string): string {
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${query}`;
}

export interface GoogleIdentity {
  /** Google's id of the account (`sub`): it never changes. */
  readonly subject: string;
  /** The email of the account, in lowercase, if Google verified it; else ''. */
  readonly email: string;
}

/** Reads the claims of a JWT without its signature (see the comment at the top). */
function claimsOf(jwt: string): Record<string, unknown> | null {
  const payload = jwt.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown;
    return claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Trades the code of a sign-in for the identity of the person. Throws an Error on any problem. */
export async function googleIdentity(
  config: GoogleConfig,
  redirectUri: string,
  code: string,
  verifier: string,
  fetchFn: typeof fetch,
  now: number,
): Promise<GoogleIdentity> {
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`token endpoint: HTTP ${response.status}`);
  const body = (await response.json()) as { id_token?: unknown };
  const claims = typeof body.id_token === 'string' ? claimsOf(body.id_token) : null;
  if (!claims) throw new Error('no ID token');
  if (!ISSUERS.includes(String(claims.iss))) throw new Error('issuer');
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(config.clientId)) throw new Error('audience');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < now - SKEW_MS) throw new Error('expired');
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) throw new Error('subject');
  // A boolean in an ID token; some older tokens have the string "true".
  const verified = claims.email_verified === true || claims.email_verified === 'true';
  const email = verified && typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  return { subject: claims.sub, email };
}
