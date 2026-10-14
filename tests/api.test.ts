import { describe, it, expect } from "vitest";
import { createMemoryStore } from "../server/store";
import { createApi } from "../server/routes";

describe("api", () => {
  it("creates event and answers", async () => {
    const store = createMemoryStore();
    const app = createApi(store);

    const createRes = await app.request("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Event",
        dateTime: "2026-12-01T10:00:00.000Z",
        capacity: 2,
        deadline: "2099-12-01T00:00:00.000Z",
      }),
    });
    expect(createRes.status).toBe(201);
    const event = await createRes.json();
    const id = (event as any).id;

    const ans = await app.request(`/events/${id}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "太郎", status: "参加" }),
    });
    expect(ans.status).toBe(201);

    const list = await app.request(`/events/${id}/responses`);
    expect(list.status).toBe(200);
    const arr = await list.json();
    expect(arr).toHaveLength(1);

    const cap = await app.request(`/events/${id}/capacity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity: 5 }),
    });
    expect(cap.status).toBe(200);
  });
});