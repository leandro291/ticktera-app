import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type InternalAuthResult = { ok: true } | { ok: false; status: 401 | 503 };

export type InternalAuthConfig = { secret?: string; audience?: string; serviceAccount?: string };

const GOOGLE_ISSUER = "https://accounts.google.com";

let remoteJwks: JWTVerifyGetKey | undefined;
// Memoizado a nivel de módulo: createRemoteJWKSet cachea las claves de Google entre llamadas.
const getRemoteJwks = () => (remoteJwks ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")));

// Se comparan hashes SHA-256 (largo fijo): un largo distinto no lanza ni filtra información por tiempo.
const sha256 = (s: string) => createHash("sha256").update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

/**
 * Autoriza la llamada interna del job de vencimiento (checkout D12, AC19). Nunca loguea el secreto ni el token.
 *
 * - Modo secreto: `cfg.secret` configurado => `Authorization: Bearer <secreto>` (tiempo constante). Local/dev.
 * - Modo OIDC: `cfg.audience` Y `cfg.serviceAccount` configurados (completo) => ID token de Google: firma (RS256),
 *   emisor, `aud`, `exp`, `email` === cuenta de servicio y `email_verified === true`. Una configuración OIDC
 *   parcial cuenta como no configurada.
 * - Ambos modos configurados: se acepta cualquiera de los dos válidos (en producción el secreto simplemente no
 *   estará cargado). Cada modo se evalúa por separado: un token OIDC inválido nunca se reintenta como secreto
 *   ni al revés, simplemente no autentica y da 401.
 * - Ningún modo configurado => 503 (falla cerrada). Sin credencial o inválida => 401.
 *
 * `jwks` es inyectable para tests (`createLocalJWKSet`); por defecto el JWKS remoto de Google.
 */
export async function authorizeInternalCall(
  req: { authorization: string | null },
  cfg: InternalAuthConfig,
  jwks?: JWTVerifyGetKey,
): Promise<InternalAuthResult> {
  const oidcOn = Boolean(cfg.audience && cfg.serviceAccount);
  if (!cfg.secret && !oidcOn) return { ok: false, status: 503 };

  const token = /^Bearer +(\S+)$/i.exec(req.authorization ?? "")?.[1];
  if (!token) return { ok: false, status: 401 };

  if (cfg.secret && safeEqual(token, cfg.secret)) return { ok: true };

  if (oidcOn) {
    try {
      const { payload } = await jwtVerify(token, jwks ?? getRemoteJwks(), {
        issuer: GOOGLE_ISSUER,
        audience: cfg.audience,
        algorithms: ["RS256"],
      });
      if (payload.email === cfg.serviceAccount && payload.email_verified === true) return { ok: true };
    } catch {
      // Firma, emisor, aud, exp o formato inválidos => 401 (sin detalle: no se filtra el motivo).
    }
  }
  return { ok: false, status: 401 };
}
