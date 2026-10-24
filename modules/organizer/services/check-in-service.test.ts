import { beforeEach, describe, expect, it, vi } from "vitest";

const selectRows = vi.fn();
const updateRows = vi.fn();
const dbCalls = vi.fn();

vi.mock("@/db", () => {
  const selectChain = {
    from: () => selectChain,
    innerJoin: () => selectChain,
    where: () => selectChain,
    limit: () => selectRows(),
  };
  const updateChain = {
    set: () => updateChain,
    where: () => updateChain,
    returning: () => updateRows(),
  };
  return {
    db: {
      select: () => (dbCalls("select"), selectChain),
      update: () => (dbCalls("update"), updateChain),
    },
  };
});

import { checkInTicket } from "./check-in-service";

const row = {
  id: "t1",
  holderName: "Ana",
  ticketStatus: "valid",
  orderStatus: "paid",
  tierName: "General",
  eventTitle: "Rock",
  eventStatus: "published",
  eventOrganizerId: "org-1",
};
const input = { code: "ABCDEF234567" };
let n = 0;
// El limitador es singleton de módulo: cada test usa un actor nuevo.
const freshOrganizer = () => {
  const id = `user-${n++}`;
  return { id, role: "organizer" as const };
};

beforeEach(() => {
  vi.clearAllMocks();
  updateRows.mockResolvedValue([{ id: "t1" }]);
});

describe("checkInTicket", () => {
  it("AC3: éxito devuelve el ticket y marca used", async () => {
    const a = freshOrganizer();
    selectRows.mockResolvedValue([{ ...row, eventOrganizerId: a.id }]);
    await expect(checkInTicket(a, input)).resolves.toEqual({
      eventTitle: "Rock",
      tierName: "General",
      holderName: "Ana",
    });
    expect(dbCalls).toHaveBeenCalledWith("update");
  });

  it("AC4: admin puede marcar un evento ajeno", async () => {
    selectRows.mockResolvedValue([row]);
    await expect(checkInTicket({ id: `adm-${n++}`, role: "admin" }, input)).resolves.toBeDefined();
  });

  it("AC4: evento ajeno para organizer → not-found sin UPDATE", async () => {
    selectRows.mockResolvedValue([row]);
    await expect(checkInTicket(freshOrganizer(), input)).rejects.toMatchObject({ code: "not-found" });
    expect(dbCalls).not.toHaveBeenCalledWith("update");
  });

  it("AC5: not-found si no hay fila", async () => {
    selectRows.mockResolvedValue([]);
    await expect(checkInTicket(freshOrganizer(), input)).rejects.toMatchObject({ code: "not-found" });
  });

  it("AC5-AC7: used, void y evento inactivo no hacen UPDATE", async () => {
    const a = freshOrganizer();
    const base = { ...row, eventOrganizerId: a.id };
    for (const [patch, code] of [
      [{ ticketStatus: "used" }, "already-used"],
      [{ ticketStatus: "void" }, "void"],
      [{ orderStatus: "refunded" }, "void"],
      [{ eventStatus: "cancelled" }, "event-inactive"],
    ] as const) {
      selectRows.mockResolvedValue([{ ...base, ...patch }]);
      await expect(checkInTicket(a, input)).rejects.toMatchObject({ code });
    }
    expect(dbCalls).not.toHaveBeenCalledWith("update");
  });

  it("AC8: UPDATE RETURNING vacío → already-used", async () => {
    const a = freshOrganizer();
    selectRows.mockResolvedValue([{ ...row, eventOrganizerId: a.id }]);
    updateRows.mockResolvedValue([]);
    await expect(checkInTicket(a, input)).rejects.toMatchObject({ code: "already-used" });
  });

  it("AC9: tras 15 fallos bloquea sin llamar a db; éxitos no cuentan; cupo por usuario", async () => {
    const a = freshOrganizer();
    selectRows.mockResolvedValue([{ ...row, eventOrganizerId: a.id }]);
    for (let i = 0; i < 20; i++) await checkInTicket(a, input); // éxitos: no consumen cupo

    selectRows.mockResolvedValue([]);
    for (let i = 0; i < 15; i++) {
      await expect(checkInTicket(a, input)).rejects.toMatchObject({ code: "not-found" });
    }
    vi.clearAllMocks();
    selectRows.mockResolvedValue([{ ...row, eventOrganizerId: a.id }]);
    await expect(checkInTicket(a, input)).rejects.toMatchObject({ code: "rate-limited" });
    expect(dbCalls).not.toHaveBeenCalled();

    // otro usuario no se ve afectado
    const b = freshOrganizer();
    selectRows.mockResolvedValue([{ ...row, eventOrganizerId: b.id }]);
    await expect(checkInTicket(b, input)).resolves.toBeDefined();
  });
});
