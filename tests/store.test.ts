import { describe, it, expect } from "vitest";
import { createMemoryStore, normalizeStatus } from "../server/store";

describe("memory store", () => {
  it("creates and lists events", () => {
    const store = createMemoryStore();
    const event = store.createEvent({
      title: "テストイベント",
      dateTime: "2026-12-01T10:00:00.000Z",
      capacity: 2,
      deadline: "2026-11-30T23:59:59.000Z",
    });
    expect(store.listEvents()).toHaveLength(1);
    expect(store.getEvent(event.id)?.title).toBe("テストイベント");
  });

  it("increases capacity", () => {
    const store = createMemoryStore();
    const event = store.createEvent({
      title: "E",
      dateTime: "2026-12-01T10:00:00.000Z",
      capacity: 2,
      deadline: "2026-11-30T23:59:59.000Z",
    });
    const res = store.updateCapacity(event.id, 5);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.event.capacity).toBe(5);
    const dec = store.updateCapacity(event.id, 3);
    expect(dec.ok).toBe(false);
  });

  it("upserts responses and counts", () => {
    const store = createMemoryStore();
    const event = store.createEvent({
      title: "E",
      dateTime: "2026-12-01T10:00:00.000Z",
      capacity: 2,
      deadline: "2099-11-30T23:59:59.000Z",
    });
    store.upsertResponse(event.id, "太郎", "attending");
    store.upsertResponse(event.id, "太郎", "undecided");
    const counts = store.counts(event.id)!;
    expect(counts.attending).toBe(0);
    expect(counts.undecided).toBe(1);
    expect(store.listResponses(event.id)).toHaveLength(1);
  });

  it("enforces capacity", () => {
    const store = createMemoryStore();
    const event = store.createEvent({
      title: "E",
      dateTime: "2026-12-01T10:00:00.000Z",
      capacity: 1,
      deadline: "2099-11-30T23:59:59.000Z",
    });
    const first = store.upsertResponse(event.id, "A", "attending");
    expect(first.ok).toBe(true);
    const second = store.upsertResponse(event.id, "B", "attending");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.status).toBe(409);
  });

  it("normalizes status aliases", () => {
    expect(normalizeStatus("参加")).toBe("attending");
    expect(normalizeStatus("不参加")).toBe("not_attending");
    expect(normalizeStatus("未定")).toBe("undecided");
  });
});