import { describe, expect, it } from "vitest";
import { getActionCopy } from "./event-action-copy";

describe("getActionCopy", () => {
  it("AC19: cancelar sin ventas no habla de reembolsos", () => {
    const copy = getActionCopy("cancel", { title: "Rock", sold: 0 });
    expect(copy.title).toBe("¿Cancelar «Rock»?");
    expect(copy.description).not.toMatch(/reembols/);
    expect(copy.confirm).toBe("Cancelar evento");
  });

  it("AC19: cancelar con ventas avisa que no hay reembolso ni aviso automático", () => {
    const { description } = getActionCopy("cancel", { title: "Rock", sold: 1200 });
    expect(description).toContain("1,200 entradas");
    expect(description).toMatch(/no se reembolsan/);
    expect(description).toMatch(/compradores/);
  });

  it("AC26: eliminar explica que es definitivo", () => {
    const copy = getActionCopy("delete", { title: "Rock", sold: 0 });
    expect(copy.description).toMatch(/no se puede deshacer/);
    expect(copy.confirm).toBe("Eliminar");
  });

  it("AC26: suspender menciona al organizador y, con ventas, a los compradores", () => {
    expect(getActionCopy("suspend", { title: "Rock", sold: 0 }).description).toMatch(/organizador/);
    expect(getActionCopy("suspend", { title: "Rock", sold: 3 }).description).toMatch(/compradores/);
  });
});
