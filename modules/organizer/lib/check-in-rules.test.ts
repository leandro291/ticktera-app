import { describe, expect, it } from "vitest";
import { classifyTicket, type CheckInCandidate } from "./check-in-rules";

const base: CheckInCandidate = {
  ticketStatus: "valid",
  orderStatus: "paid",
  eventStatus: "published",
  eventOrganizerId: "org-1",
};
const owner = { id: "org-1", canCheckInAny: false };
const other = { id: "org-2", canCheckInAny: false };
const admin = { id: "adm-1", canCheckInAny: true };

describe("classifyTicket", () => {
  it("AC3: valid + paid + published de un evento propio → ok", () => {
    expect(classifyTicket(base, owner)).toBe("ok");
  });

  it("AC4: evento ajeno → not-found para organizer; admin sí puede", () => {
    expect(classifyTicket(base, other)).toBe("not-found");
    expect(classifyTicket(base, admin)).toBe("ok");
  });

  it("AC5: used → already-used", () => {
    expect(classifyTicket({ ...base, ticketStatus: "used" }, owner)).toBe("already-used");
  });

  it("AC6: void u orden no paid → void", () => {
    expect(classifyTicket({ ...base, ticketStatus: "void" }, owner)).toBe("void");
    for (const orderStatus of ["pending", "expired", "refunded"] as const) {
      expect(classifyTicket({ ...base, orderStatus }, owner)).toBe("void");
    }
  });

  it("AC7: evento no published → event-inactive", () => {
    for (const eventStatus of ["draft", "cancelled", "suspended"] as const) {
      expect(classifyTicket({ ...base, eventStatus }, owner)).toBe("event-inactive");
    }
  });

  it("AC4-AC7: precedencia D4 (ajeno gana a todo; used gana a void; void gana a event-inactive)", () => {
    const worst: CheckInCandidate = { ...base, ticketStatus: "used", orderStatus: "refunded", eventStatus: "cancelled" };
    expect(classifyTicket(worst, other)).toBe("not-found");
    expect(classifyTicket(worst, owner)).toBe("already-used");
    expect(classifyTicket({ ...worst, ticketStatus: "void" }, owner)).toBe("void");
    expect(classifyTicket({ ...worst, ticketStatus: "valid", orderStatus: "paid" }, owner)).toBe("event-inactive");
    expect(classifyTicket(worst, admin)).toBe("already-used");
  });
});
