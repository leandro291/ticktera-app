import { describe, expect, it } from "vitest";
import {
  deleteUserSchema,
  inviteUserSchema,
  setStatusSchema,
  updateUserSchema,
} from "./user-admin-schema";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

describe("setStatusSchema", () => {
  it("AC13: rechaza userId que no es uuid", () => {
    expect(setStatusSchema.safeParse({ userId: "abc", status: "active" }).success).toBe(false);
  });

  it("AC13: rechaza estado desconocido", () => {
    expect(setStatusSchema.safeParse({ userId: uuid, status: "banned" }).success).toBe(false);
  });

  it("AC13: acepta active y suspended", () => {
    expect(setStatusSchema.safeParse({ userId: uuid, status: "active" }).success).toBe(true);
    expect(setStatusSchema.safeParse({ userId: uuid, status: "suspended" }).success).toBe(true);
  });
});

describe("inviteUserSchema", () => {
  const invite = { email: "Staff@Example.com", role: "organizer" };

  it("AC8: normaliza el correo a minúsculas", () => {
    expect(inviteUserSchema.parse(invite)).toEqual({ email: "staff@example.com", role: "organizer" });
  });

  it("AC9b: rechaza correo inválido", () => {
    expect(inviteUserSchema.safeParse({ ...invite, email: "no-es-email" }).success).toBe(false);
  });

  it("AC8: rechaza customer y super_admin", () => {
    expect(inviteUserSchema.safeParse({ ...invite, role: "customer" }).success).toBe(false);
    expect(inviteUserSchema.safeParse({ ...invite, role: "super_admin" }).success).toBe(false);
  });

  it("AC8: acepta admin y organizer", () => {
    expect(inviteUserSchema.safeParse({ ...invite, role: "admin" }).success).toBe(true);
    expect(inviteUserSchema.safeParse(invite).success).toBe(true);
  });
});

describe("updateUserSchema", () => {
  const update = { userId: uuid, fullName: "Ana Perez", role: "organizer" };

  it("AC10: rechaza nombre corto", () => {
    expect(updateUserSchema.safeParse({ ...update, fullName: " A " }).success).toBe(false);
  });

  it("AC10: colapsa espacios múltiples y recorta", () => {
    expect(updateUserSchema.parse({ ...update, fullName: "  Ana   María \t Pérez  " }).fullName).toBe(
      "Ana María Pérez",
    );
  });

  it("AC16: rechaza userId que no es uuid", () => {
    expect(updateUserSchema.safeParse({ ...update, userId: "abc" }).success).toBe(false);
  });

  it("AC16: rechaza super_admin como rol", () => {
    expect(updateUserSchema.safeParse({ ...update, role: "super_admin" }).success).toBe(false);
  });

  it("AC10: status es opcional y rechaza valores inválidos", () => {
    expect(updateUserSchema.safeParse(update).success).toBe(true);
    expect(updateUserSchema.safeParse({ ...update, status: "suspended" }).success).toBe(true);
    expect(updateUserSchema.safeParse({ ...update, status: "banned" }).success).toBe(false);
  });
});

describe("deleteUserSchema", () => {
  it("AC16: acepta uuid y rechaza lo demás", () => {
    expect(deleteUserSchema.safeParse({ userId: uuid }).success).toBe(true);
    expect(deleteUserSchema.safeParse({ userId: "abc" }).success).toBe(false);
    expect(deleteUserSchema.safeParse({}).success).toBe(false);
  });
});
