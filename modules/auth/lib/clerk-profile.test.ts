import { describe, expect, it } from "vitest";
import type { User } from "@clerk/nextjs/server";
import {
  needsRoleMirror,
  profileFromClerkUser,
  profileFromWebhook,
  resolveRole,
  type WebhookUserData,
} from "./clerk-profile";

const verified = { status: "verified" };

function webhook(over: Partial<WebhookUserData> = {}): WebhookUserData {
  return {
    id: "user_1",
    first_name: "Ana",
    last_name: "Pérez",
    primary_email_address_id: "e2",
    email_addresses: [
      { id: "e1", email_address: "otro@mail.com", verification: verified },
      { id: "e2", email_address: "Ana.Perez@Mail.com", verification: verified },
    ],
    public_metadata: {},
    ...over,
  };
}

describe("profileFromWebhook", () => {
  it("AC5: elige el email primario entre varios por primary_email_address_id", () => {
    expect(profileFromWebhook(webhook())?.email).toBe("ana.perez@mail.com");
  });

  it("AC5: email primario no verificado -> null", () => {
    const data = webhook({
      email_addresses: [
        { id: "e1", email_address: "a@mail.com", verification: verified },
        { id: "e2", email_address: "b@mail.com", verification: { status: "unverified" } },
      ],
    });
    expect(profileFromWebhook(data)).toBeNull();
  });

  it("AC5: sin primario o sin verificación -> null", () => {
    expect(profileFromWebhook(webhook({ primary_email_address_id: null }))).toBeNull();
    expect(
      profileFromWebhook(
        webhook({
          primary_email_address_id: "e1",
          email_addresses: [{ id: "e1", email_address: "a@mail.com", verification: null }],
        }),
      ),
    ).toBeNull();
  });

  it("AC3: nombre first + last, solo first y vacío (parte local del email)", () => {
    expect(profileFromWebhook(webhook())?.fullName).toBe("Ana Pérez");
    expect(profileFromWebhook(webhook({ last_name: null }))?.fullName).toBe("Ana");
    expect(
      profileFromWebhook(webhook({ first_name: null, last_name: "  " }))?.fullName,
    ).toBe("ana.perez");
  });

  it("AC3: lee metadataRole válido y descarta inválido", () => {
    expect(profileFromWebhook(webhook({ public_metadata: { role: "admin" } }))?.metadataRole).toBe("admin");
    expect(profileFromWebhook(webhook({ public_metadata: { role: "foo" } }))?.metadataRole).toBeNull();
    expect(profileFromWebhook(webhook({ public_metadata: undefined }))?.metadataRole).toBeNull();
  });
});

describe("profileFromClerkUser", () => {
  const user = (status = "verified") =>
    ({
      id: "user_2",
      firstName: "Luis",
      lastName: null,
      primaryEmailAddressId: "e1",
      emailAddresses: [{ id: "e1", emailAddress: "Luis@Mail.com", verification: { status } }],
      publicMetadata: { role: "organizer" },
    }) as unknown as User;

  it("AC5: perfil del Backend SDK con email en minúsculas", () => {
    expect(profileFromClerkUser(user())).toEqual({
      clerkUserId: "user_2",
      email: "luis@mail.com",
      fullName: "Luis",
      metadataRole: "organizer",
    });
  });

  it("AC5: email no verificado -> null", () => {
    expect(profileFromClerkUser(user("unverified"))).toBeNull();
  });
});

describe("resolveRole", () => {
  const email = "boss@mail.com";

  it("AC5: match con superAdminEmail (case-insensitive) -> super_admin", () => {
    expect(resolveRole({ current: null, email, superAdminEmail: "BOSS@Mail.com" })).toBe("super_admin");
  });

  it("AC5: sin env -> customer; sin match no promueve", () => {
    expect(resolveRole({ current: null, email })).toBe("customer");
    expect(resolveRole({ current: null, email, superAdminEmail: "otro@mail.com" })).toBe("customer");
  });

  it("AC5: no degrada admin ni super_admin", () => {
    expect(resolveRole({ current: "admin", email })).toBe("admin");
    expect(resolveRole({ current: "super_admin", email, superAdminEmail: "otro@mail.com" })).toBe("super_admin");
  });
  it("invitación: fila nueva toma admin/organizer de metadata; nada más", () => {
    expect(resolveRole({ current: null, email, invitedRole: "admin" })).toBe("admin");
    expect(resolveRole({ current: null, email, invitedRole: "organizer" })).toBe("organizer");
    expect(resolveRole({ current: null, email, invitedRole: "super_admin" })).toBe("customer");
    expect(resolveRole({ current: null, email, invitedRole: "customer" })).toBe("customer");
  });

  it("invitación: fila existente y super admin ganan sobre metadata", () => {
    expect(resolveRole({ current: "customer", email, invitedRole: "admin" })).toBe("customer");
    expect(resolveRole({ current: null, email, superAdminEmail: email, invitedRole: "organizer" })).toBe("super_admin");
  });
});

describe("needsRoleMirror", () => {
  it("AC3: null y distinto -> true; igual -> false", () => {
    expect(needsRoleMirror("customer", null)).toBe(true);
    expect(needsRoleMirror("admin", "customer")).toBe(true);
    expect(needsRoleMirror("admin", "admin")).toBe(false);
  });
});
