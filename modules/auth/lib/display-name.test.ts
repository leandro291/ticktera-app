import { describe, expect, it } from "vitest";
import { initials, nameFromEmail, safeRedirect } from "./display-name";

describe("display name helpers", () => {
  it("AC10: derives a readable name from the email", () => {
    expect(nameFromEmail("ana.perez@mail.com")).toBe("Ana Perez");
    expect(nameFromEmail("luis_g-2@mail.com")).toBe("Luis G 2");
  });

  it("AC10: builds up to two initials", () => {
    expect(initials("Ana Pérez Soto")).toBe("AP");
    expect(initials("  ana ")).toBe("A");
  });

  it("AC10: only accepts same-site redirects", () => {
    expect(safeRedirect("/checkout?event=evt-001")).toBe("/checkout?event=evt-001");
    expect(safeRedirect("https://evil.com")).toBe("/my-tickets");
    expect(safeRedirect("//evil.com")).toBe("/my-tickets");
    expect(safeRedirect(undefined)).toBe("/my-tickets");
  });
});
