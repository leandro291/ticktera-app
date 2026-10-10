import { describe, expect, it } from "vitest";
import { checkRoleChange, checkStatusChange, checkUserDelete, checkUserUpdate } from "./role-change-rules";

const actor = { id: "actor" };

describe("checkRoleChange", () => {
  it("AC11: rechaza cambiarse el rol a uno mismo", () => {
    expect(checkRoleChange(actor, { id: "actor", role: "super_admin" }, "admin")).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("AC11: rechaza tocar a un super_admin", () => {
    expect(checkRoleChange(actor, { id: "other", role: "super_admin" }, "admin")).toEqual({
      ok: false,
      reason: "target-super-admin",
    });
  });

  it("AC11: rechaza asignar super_admin", () => {
    expect(checkRoleChange(actor, { id: "other", role: "customer" }, "super_admin")).toEqual({
      ok: false,
      reason: "invalid-role",
    });
  });

  it.each(["admin", "organizer", "customer"] as const)("AC11: permite asignar %s", (next) => {
    expect(checkRoleChange(actor, { id: "other", role: "organizer" }, next)).toEqual({ ok: true });
  });

  it("AC11: permite reasignar el mismo rol (reintento idempotente)", () => {
    expect(checkRoleChange(actor, { id: "other", role: "admin" }, "admin")).toEqual({ ok: true });
  });
});

describe("checkStatusChange", () => {
  it("AC12: rechaza suspenderse a uno mismo", () => {
    expect(checkStatusChange(actor, { id: "actor", role: "admin" })).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("AC12: rechaza suspender a un super_admin", () => {
    expect(checkStatusChange(actor, { id: "other", role: "super_admin" })).toEqual({
      ok: false,
      reason: "target-super-admin",
    });
  });

  it("AC12: caso feliz", () => {
    expect(checkStatusChange(actor, { id: "other", role: "organizer" })).toEqual({ ok: true });
  });
});

describe("checkUserUpdate", () => {
  const target = { id: "other", role: "customer", status: "active" } as const;

  it("AC16: rechaza editarse a uno mismo", () => {
    expect(checkUserUpdate(actor, { ...target, id: "actor" }, { role: "admin" })).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("AC16: rechaza tocar a un super_admin", () => {
    expect(checkUserUpdate(actor, { ...target, role: "super_admin" }, { role: "admin" })).toEqual({
      ok: false,
      reason: "target-super-admin",
    });
  });

  it("AC16: rechaza asignar super_admin", () => {
    expect(checkUserUpdate(actor, target, { role: "super_admin" })).toEqual({
      ok: false,
      reason: "invalid-role",
    });
  });

  it("AC12: rechaza cambiar de rol a un organizador suspendido", () => {
    expect(
      checkUserUpdate(actor, { ...target, role: "organizer", status: "suspended" }, { role: "customer" }),
    ).toEqual({ ok: false, reason: "suspended-organizer" });
  });

  it("AC12: organizador suspendido que sigue organizador es ok", () => {
    expect(
      checkUserUpdate(actor, { ...target, role: "organizer", status: "suspended" }, { role: "organizer" }),
    ).toEqual({ ok: true });
  });

  it("AC12: organizador activo a customer es ok", () => {
    expect(checkUserUpdate(actor, { ...target, role: "organizer" }, { role: "customer" })).toEqual({
      ok: true,
    });
  });

  it("AC12: customer suspendido a organizer es ok", () => {
    expect(checkUserUpdate(actor, { ...target, status: "suspended" }, { role: "organizer" })).toEqual({
      ok: true,
    });
  });
});

describe("checkUserDelete", () => {
  it("AC16: rechaza eliminarse a uno mismo", () => {
    expect(checkUserDelete(actor, { id: "actor", role: "admin" })).toEqual({ ok: false, reason: "self" });
  });

  it("AC16: rechaza eliminar a un super_admin", () => {
    expect(checkUserDelete(actor, { id: "other", role: "super_admin" })).toEqual({
      ok: false,
      reason: "target-super-admin",
    });
  });

  it("AC16: caso feliz", () => {
    expect(checkUserDelete(actor, { id: "other", role: "customer" })).toEqual({ ok: true });
  });
});
