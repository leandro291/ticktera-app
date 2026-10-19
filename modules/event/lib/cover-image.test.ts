import { describe, expect, it } from "vitest";
import { coverPathname, isBlobUrl, sniffImageType, validateCover } from "./cover-image";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const GIF = new TextEncoder().encode("GIF89a......");
const SVG = new TextEncoder().encode("<svg xmlns=");
const MiB2 = 2 * 1024 * 1024;

describe("sniffImageType", () => {
  it("AC20: reconoce JPEG, PNG y WebP por sus cabeceras reales", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("AC20: GIF, SVG, vacío y bytes aleatorios → null", () => {
    expect(sniffImageType(GIF)).toBeNull();
    expect(sniffImageType(SVG)).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
    expect(sniffImageType(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeNull();
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]))).toBeNull(); // RIFF WAVE
  });
});

describe("validateCover", () => {
  it("AC20: ok por formato, con su extensión", () => {
    expect(validateCover({ size: 100, type: "image/jpeg" }, JPEG)).toEqual({ ok: true, mime: "image/jpeg", ext: "jpg" });
    expect(validateCover({ size: 100, type: "image/png" }, PNG)).toEqual({ ok: true, mime: "image/png", ext: "png" });
    expect(validateCover({ size: 100, type: "image/webp" }, WEBP)).toEqual({ ok: true, mime: "image/webp", ext: "webp" });
  });

  it("AC20: vacío y tamaño (2 MiB exactos ok, +1 no)", () => {
    expect(validateCover({ size: 0, type: "image/jpeg" }, JPEG)).toEqual({ ok: false, reason: "empty" });
    expect(validateCover({ size: MiB2, type: "image/jpeg" }, JPEG).ok).toBe(true);
    expect(validateCover({ size: MiB2 + 1, type: "image/jpeg" }, JPEG)).toEqual({ ok: false, reason: "too-large" });
  });

  it("AC20: tipos no permitidos", () => {
    expect(validateCover({ size: 100, type: "image/svg+xml" }, SVG)).toEqual({ ok: false, reason: "unsupported-type" });
    expect(validateCover({ size: 100, type: "image/gif" }, GIF)).toEqual({ ok: false, reason: "unsupported-type" });
    expect(validateCover({ size: 100, type: "toString" }, JPEG)).toEqual({ ok: false, reason: "unsupported-type" });
  });

  it("AC20: magic bytes que no coinciden con el MIME declarado", () => {
    expect(validateCover({ size: 100, type: "image/jpeg" }, PNG)).toEqual({ ok: false, reason: "mime-mismatch" });
    expect(validateCover({ size: 100, type: "image/jpeg" }, new TextEncoder().encode("MZ\x90\x00exe...."))).toEqual({
      ok: false,
      reason: "mime-mismatch",
    });
  });
});

describe("coverPathname", () => {
  it("AC20: events/<id>/<uuid>.<ext>", () => {
    expect(coverPathname("evt", "webp", "u-1")).toBe("events/evt/u-1.webp");
  });
});

describe("isBlobUrl", () => {
  it("AC20: solo https en un host de Vercel Blob público", () => {
    expect(isBlobUrl("https://abc123.public.blob.vercel-storage.com/events/x/y.jpg")).toBe(true);
    expect(isBlobUrl("http://abc123.public.blob.vercel-storage.com/events/x/y.jpg")).toBe(false);
    expect(isBlobUrl("https://abc123.public.blob.vercel-storage.com.evil.com/y.jpg")).toBe(false);
    expect(isBlobUrl("https://evilpublic.blob.vercel-storage.com/y.jpg")).toBe(false);
    expect(isBlobUrl("/images/x.jpg")).toBe(false);
    expect(isBlobUrl(null)).toBe(false);
  });
});
