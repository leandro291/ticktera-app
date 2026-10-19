import { describe, expect, it } from "vitest";
import type { EventDbStatus } from "../types/event-list";
import { allowedActions, nextStatus, type EventAction } from "./event-transitions";

const OWNER = { owner: true, moderator: false };
const MODERATOR = { owner: false, moderator: true };
const BOTH = { owner: true, moderator: true };
const NONE = { owner: false, moderator: false };

const TABLE: Record<EventDbStatus, { owner: EventAction[]; moderator: EventAction[]; both: EventAction[] }> = {
  draft: { owner: ["edit", "publish", "delete"], moderator: [], both: ["edit", "publish", "delete"] },
  published: {
    owner: ["edit", "unpublish", "cancel", "delete"],
    moderator: ["suspend", "cancel"],
    both: ["edit", "unpublish", "cancel", "delete", "suspend"],
  },
  suspended: { owner: [], moderator: ["reactivate", "cancel"], both: ["reactivate", "cancel"] },
  cancelled: { owner: ["delete"], moderator: [], both: ["delete"] },
};

const sorted = (a: EventAction[]) => [...a].sort();

describe("allowedActions", () => {
  for (const [status, expected] of Object.entries(TABLE) as [EventDbStatus, (typeof TABLE)[EventDbStatus]][]) {
    it(`AC6: ${status} × dueño, moderador, ambos y ninguno`, () => {
      expect(sorted(allowedActions(status, OWNER))).toEqual(sorted(expected.owner));
      expect(sorted(allowedActions(status, MODERATOR))).toEqual(sorted(expected.moderator));
      expect(sorted(allowedActions(status, BOTH))).toEqual(sorted(expected.both));
      expect(allowedActions(status, NONE)).toEqual([]);
    });
  }

  it("AC6: suspended no ofrece nada al dueño y cancelled solo delete", () => {
    expect(allowedActions("suspended", OWNER)).toEqual([]);
    expect(allowedActions("cancelled", OWNER)).toEqual(["delete"]);
  });

  it("AC6: el moderador nunca recibe edit, delete ni acciones sobre draft", () => {
    for (const status of Object.keys(TABLE) as EventDbStatus[]) {
      const actions = allowedActions(status, MODERATOR);
      expect(actions).not.toContain("edit");
      expect(actions).not.toContain("delete");
    }
    expect(allowedActions("draft", MODERATOR)).toEqual([]);
  });

  it("AC6: dueño y moderador a la vez no duplica acciones", () => {
    const actions = allowedActions("published", BOTH);
    expect(new Set(actions).size).toBe(actions.length);
  });
});

describe("nextStatus", () => {
  it("AC6: estado destino de cada acción", () => {
    expect(nextStatus("publish")).toBe("published");
    expect(nextStatus("unpublish")).toBe("draft");
    expect(nextStatus("cancel")).toBe("cancelled");
    expect(nextStatus("suspend")).toBe("suspended");
    expect(nextStatus("reactivate")).toBe("published");
  });
});
