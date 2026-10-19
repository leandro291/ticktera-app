import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { authorizeInternalCall } from "./internal-auth";

const SECRET = "s".repeat(32);
const AUD = "https://app.example.com/api/internal/expire-orders";
const SA = "scheduler@proj.iam.gserviceaccount.com";
const ISS = "https://accounts.google.com";
const KID = "k1";
const oidcCfg = { audience: AUD, serviceAccount: SA };

const call = (authorization: string | null, cfg: Parameters<typeof authorizeInternalCall>[1], jwks?: JWTVerifyGetKey) =>
  authorizeInternalCall({ authorization }, cfg, jwks);

describe("authorizeInternalCall: secreto", () => {
  it("AC19: secreto correcto => ok", async () => {
    expect(await call(`Bearer ${SECRET}`, { secret: SECRET })).toEqual({ ok: true });
  });
  it("AC19: secreto incorrecto => 401", async () => {
    expect(await call(`Bearer ${"x".repeat(32)}`, { secret: SECRET })).toEqual({ ok: false, status: 401 });
  });
  it("AC19: secreto de largo distinto => 401 sin lanzar", async () => {
    expect(await call("Bearer corto", { secret: SECRET })).toEqual({ ok: false, status: 401 });
    expect(await call(`Bearer ${SECRET}extra`, { secret: SECRET })).toEqual({ ok: false, status: 401 });
  });
  it("AC19: sin credencial => 401", async () => {
    expect(await call(null, { secret: SECRET })).toEqual({ ok: false, status: 401 });
    expect(await call("", { secret: SECRET })).toEqual({ ok: false, status: 401 });
    expect(await call("Basic abc", { secret: SECRET })).toEqual({ ok: false, status: 401 });
    expect(await call("Bearer ", { secret: SECRET })).toEqual({ ok: false, status: 401 });
  });
});

describe("authorizeInternalCall: sin configuración", () => {
  it("AC19: ni secreto ni OIDC => 503, aunque venga credencial", async () => {
    expect(await call(null, {})).toEqual({ ok: false, status: 503 });
    expect(await call(`Bearer ${SECRET}`, {})).toEqual({ ok: false, status: 503 });
  });
  it("AC19: OIDC parcial cuenta como no configurado => 503", async () => {
    expect(await call("Bearer x", { audience: AUD })).toEqual({ ok: false, status: 503 });
    expect(await call("Bearer x", { serviceAccount: SA })).toEqual({ ok: false, status: 503 });
  });
});

describe("authorizeInternalCall: OIDC", () => {
  let privateKey: CryptoKey;
  let otherKey: CryptoKey;
  let jwks: JWTVerifyGetKey;

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    privateKey = pair.privateKey;
    otherKey = (await generateKeyPair("RS256")).privateKey;
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: "RS256", use: "sig" };
    jwks = createLocalJWKSet({ keys: [jwk] });
  });

  type Claims = { iss?: string; aud?: string; email?: string; email_verified?: boolean; exp?: string | number; key?: CryptoKey };
  const sign = ({ iss = ISS, aud = AUD, email = SA, email_verified = true, exp = "5m", key }: Claims = {}) =>
    new SignJWT({ email, email_verified })
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .setIssuer(iss)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(key ?? privateKey);
  const callWith = async (claims?: Claims) => call(`Bearer ${await sign(claims)}`, oidcCfg, jwks);
  const denied = { ok: false, status: 401 };

  it("AC19: token válido => ok", async () => {
    expect(await callWith()).toEqual({ ok: true });
  });
  it("AC19: aud errónea => 401", async () => {
    expect(await callWith({ aud: "https://otra.example.com" })).toEqual(denied);
  });
  it("AC19: emisor erróneo => 401", async () => {
    expect(await callWith({ iss: "https://evil.example.com" })).toEqual(denied);
  });
  it("AC19: email erróneo => 401", async () => {
    expect(await callWith({ email: "otra@proj.iam.gserviceaccount.com" })).toEqual(denied);
  });
  it("AC19: email_verified falso => 401", async () => {
    expect(await callWith({ email_verified: false })).toEqual(denied);
  });
  it("AC19: email_verified ausente => 401", async () => {
    const token = await new SignJWT({ email: SA })
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .setIssuer(ISS)
      .setAudience(AUD)
      .setExpirationTime("5m")
      .sign(privateKey);
    expect(await call(`Bearer ${token}`, oidcCfg, jwks)).toEqual(denied);
  });
  it("AC19: firma de otra clave => 401", async () => {
    expect(await callWith({ key: otherKey })).toEqual(denied);
  });
  it("AC19: token expirado => 401", async () => {
    expect(await callWith({ exp: Math.floor(Date.now() / 1000) - 60 })).toEqual(denied);
  });
  it("AC19: basura que no es JWT => 401 sin lanzar", async () => {
    expect(await call("Bearer no-es-un-jwt", oidcCfg, jwks)).toEqual(denied);
  });
  it("AC19: con solo OIDC configurado, el secreto no autentica", async () => {
    expect(await call(`Bearer ${SECRET}`, oidcCfg, jwks)).toEqual(denied);
  });
  it("AC19: ambos modos configurados aceptan cualquiera de los dos válidos", async () => {
    const cfg = { secret: SECRET, ...oidcCfg };
    expect(await call(`Bearer ${SECRET}`, cfg, jwks)).toEqual({ ok: true });
    expect(await call(`Bearer ${await sign()}`, cfg, jwks)).toEqual({ ok: true });
    expect(await call(`Bearer ${await sign({ aud: "https://otra.example.com" })}`, cfg, jwks)).toEqual(denied);
  });
});
