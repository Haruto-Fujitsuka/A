import { Hono } from "hono";
import { z } from "zod";
import type { EventStore } from "./store.js";
import { isValidDate, normalizeStatus } from "./store.js";
import type { AttendanceStatus } from "../shared/types.js";

const createEventSchema = z.object({
  title: z.string().min(1),
  dateTime: z.string().min(1),
  capacity: z.number().int().positive(),
  deadline: z.string().min(1).optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  dateTime: z.string().min(1).optional(),
  deadline: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
});

const responseSchema = z.object({
  name: z.string().min(1),
  status: z.union([z.string(), z.enum(["attending", "not_attending", "undecided"])]),
});

export function createApi(store: EventStore): Hono {
  const app = new Hono();

  const attachCounts = (event: any) => ({
    ...event,
    counts: store.counts(event.id),
  });

  app.get("/events", (c) => {
    const events = store.listEvents().map(attachCounts);
    return c.json(events);
  });

  const createHandler = async (c: any) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
    }
    const { title, dateTime, capacity, deadline } = parsed.data;
    if (!isValidDate(dateTime)) {
      return c.json({ error: "invalid date" }, 400);
    }
    const event = store.createEvent({ title, dateTime, capacity, deadline: deadline ?? dateTime });
    return c.json(attachCounts(event), 201);
  };

  app.post("/events", createHandler);
  app.post("/events/create", createHandler);

  app.get("/events/:id", (c) => {
    const event = store.getEvent(c.req.param("id"));
    if (!event) return c.json({ error: "event not found" }, 404);
    return c.json(attachCounts(event));
  });

  const updateHandler = async (c: any) => {
    const id = c.req.param("id");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
    }
    const res = store.updateEvent(id, parsed.data);
    if (!res.ok) return c.json({ error: res.error }, res.status);
    return c.json(attachCounts(res.event));
  };

  app.patch("/events/:id", updateHandler);
  app.put("/events/:id", updateHandler);

  const capacityHandler = async (c: any) => {
    const id = c.req.param("id");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const capacity = (body as any)?.capacity;
    if (typeof capacity !== "number") {
      return c.json({ error: "capacity is required" }, 400);
    }
    const res = store.updateCapacity(id, capacity);
    if (!res.ok) return c.json({ error: res.error }, res.status);
    return c.json(attachCounts(res.event));
  };

  app.patch("/events/:id/capacity", capacityHandler);
  app.post("/events/:id/capacity", capacityHandler);
  app.post("/events/:id/increase-capacity", capacityHandler);

  app.delete("/events/:id", (c) => {
    const ok = store.deleteEvent(c.req.param("id"));
    if (!ok) return c.json({ error: "event not found" }, 404);
    return c.json({ ok: true });
  });

  const responseHandler = async (c: any) => {
    const eventId = c.req.param("id");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid input", details: parsed.error.flatten() }, 400);
    }
    const status = normalizeStatus(String(parsed.data.status));
    if (!status) return c.json({ error: "invalid status" }, 400);
    const res = store.upsertResponse(eventId, parsed.data.name, status);
    if (!res.ok) return c.json({ error: res.error }, res.status);
    return c.json(res.response, 201);
  };

  const responsePaths = [
    "/events/:id/responses",
    "/events/:id/rsvps",
    "/events/:id/attendance",
    "/events/:id/answers",
  ];
  for (const p of responsePaths) {
    app.post(p, responseHandler);
  }

  const listResponsesHandler = (c: any) => {
    const eventId = c.req.param("id");
    const event = store.getEvent(eventId);
    if (!event) return c.json({ error: "event not found" }, 404);
    return c.json(store.listResponses(eventId));
  };
  for (const p of responsePaths) {
    app.get(p, listResponsesHandler);
  }

  app.get("/events/:id/counts", (c) => {
    const counts = store.counts(c.req.param("id"));
    if (!counts) return c.json({ error: "event not found" }, 404);
    return c.json(counts);
  });

  const historyHandler = (c: any) => {
    const eventId = c.req.param("id");
    const event = store.getEvent(eventId);
    if (!event) return c.json({ error: "event not found" }, 404);
    return c.json(store.listHistory(eventId));
  };
  const historyPaths = [
    "/events/:id/history",
    "/events/:id/responses/history",
    "/events/:id/response-history",
    "/events/:id/change-history",
  ];
  for (const p of historyPaths) {
    app.get(p, historyHandler);
  }

  // convenience: get a single person's response
  app.get("/events/:id/responses/:name", (c) => {
    const r = store.getResponse(c.req.param("id"), decodeURIComponent(c.req.param("name")));
    if (!r) return c.json({ error: "not found" }, 404);
    return c.json(r);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  return app;
}
