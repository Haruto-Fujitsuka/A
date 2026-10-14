import { randomUUID } from "node:crypto";
import {
  ATTENDANCE_LABELS,
  type AttendanceStatus,
  type Event,
  type EventWithCounts,
  type ResponseRecord,
} from "../shared/types.js";

type CreateEventInput = {
  title: string;
  dateTime: string;
  capacity: number;
  deadline: string;
};

type UpdateEventInput = {
  title?: string;
  dateTime?: string;
  deadline?: string;
  capacity?: number;
};

export interface EventStore {
  createEvent(input: CreateEventInput): Event;
  getEvent(id: string): Event | undefined;
  listEvents(): Event[];
  updateEvent(id: string, input: UpdateEventInput): { ok: true; event: Event } | { ok: false; error: string; status: number };
  updateCapacity(id: string, capacity: number): { ok: true; event: Event } | { ok: false; error: string; status: number };
  deleteEvent(id: string): boolean;
  upsertResponse(eventId: string, name: string, status: AttendanceStatus): { ok: true; response: ResponseRecord } | { ok: false; error: string; status: number };
  getResponse(eventId: string, name: string): ResponseRecord | undefined;
  listResponses(eventId: string): ResponseRecord[];
  counts(eventId: string): { attending: number; not_attending: number; undecided: number; total: number } | undefined;
}

const VALID_STATUSES: AttendanceStatus[] = ["attending", "not_attending", "undecided"];

export function normalizeStatus(value: string): AttendanceStatus | undefined {
  const v = value.trim().toLowerCase();
  const map: Record<string, AttendanceStatus> = {
    attending: "attending",
    attend: "attending",
    yes: "attending",
    participate: "attending",
    参加: "attending",
    not_attending: "not_attending",
    "not-attending": "not_attending",
    absent: "not_attending",
    no: "not_attending",
    不参加: "not_attending",
    undecided: "undecided",
    maybe: "undecided",
    unknown: "undecided",
    未定: "undecided",
  };
  if (VALID_STATUSES.includes(value as AttendanceStatus)) return value as AttendanceStatus;
  return map[v] ?? map[value];
}

export function isValidDate(value: string): boolean {
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

export function createMemoryStore(): EventStore {
  const events = new Map<string, Event>();
  const responses = new Map<string, ResponseRecord>(); // key eventId::name

  const key = (eventId: string, name: string) => `${eventId}::${name.trim().toLowerCase()}`;

  const recompute = (eventId: string) => {
    // no-op placeholder for future
    void eventId;
  };

  const store: EventStore = {
    createEvent(input) {
      const now = new Date().toISOString();
      const event: Event = {
        id: randomUUID(),
        title: input.title.trim(),
        dateTime: input.dateTime,
        capacity: input.capacity,
        deadline: input.deadline,
        createdAt: now,
      };
      events.set(event.id, event);
      return event;
    },
    getEvent(id) {
      return events.get(id);
    },
    listEvents() {
      return Array.from(events.values()).sort((a, b) =>
        Date.parse(a.dateTime) - Date.parse(b.dateTime),
      );
    },
    updateEvent(id, input) {
      const event = events.get(id);
      if (!event) return { ok: false, error: "event not found", status: 404 };
      if (input.title !== undefined) event.title = input.title.trim();
      if (input.dateTime !== undefined) {
        if (!isValidDate(input.dateTime)) return { ok: false, error: "invalid dateTime", status: 400 };
        event.dateTime = input.dateTime;
      }
      if (input.deadline !== undefined) {
        if (!isValidDate(input.deadline)) return { ok: false, error: "invalid deadline", status: 400 };
        event.deadline = input.deadline;
      }
      if (input.capacity !== undefined) {
        const cap = input.capacity;
        if (!Number.isInteger(cap) || cap <= 0) {
          return { ok: false, error: "capacity must be a positive integer", status: 400 };
        }
        const currentAttending = countAttending(event.id, responses);
        if (cap < event.capacity) {
          return { ok: false, error: "capacity can only be increased", status: 400 };
        }
        if (cap < currentAttending) {
          return { ok: false, error: "capacity cannot be lower than current attending count", status: 400 };
        }
        event.capacity = cap;
      }
      events.set(id, event);
      return { ok: true, event };
    },
    updateCapacity(id, capacity) {
      return store.updateEvent(id, { capacity });
    },
    deleteEvent(id) {
      const existed = events.delete(id);
      if (existed) {
        for (const k of Array.from(responses.keys())) {
          if (k.startsWith(`${id}::`)) responses.delete(k);
        }
      }
      return existed;
    },
    upsertResponse(eventId, name, status) {
      const event = events.get(eventId);
      if (!event) return { ok: false, error: "event not found", status: 404 };
      if (!name.trim()) return { ok: false, error: "name is required", status: 400 };
      if (!VALID_STATUSES.includes(status)) return { ok: false, error: "invalid status", status: 400 };
      if (Date.now() > Date.parse(event.deadline)) {
        return { ok: false, error: "response deadline has passed", status: 403 };
      }
      const k = key(eventId, name);
      const currentAttending = countAttendingExcluding(eventId, name, responses);
      if (status === "attending" && currentAttending >= event.capacity) {
        return { ok: false, error: "event is full", status: 409 };
      }
      const existing = responses.get(k);
      const now = new Date().toISOString();
      const rec: ResponseRecord = {
        id: existing?.id ?? randomUUID(),
        eventId,
        name: name.trim(),
        status,
        statusLabel: ATTENDANCE_LABELS[status],
        updatedAt: now,
      };
      responses.set(k, rec);
      recompute(eventId);
      return { ok: true, response: rec };
    },
    getResponse(eventId, name) {
      return responses.get(key(eventId, name));
    },
    listResponses(eventId) {
      return Array.from(responses.values()).filter((r) => r.eventId === eventId);
    },
    counts(eventId) {
      const event = events.get(eventId);
      if (!event) return undefined;
      const list = Array.from(responses.values()).filter((r) => r.eventId === eventId);
      const attending = list.filter((r) => r.status === "attending").length;
      const not_attending = list.filter((r) => r.status === "not_attending").length;
      const undecided = list.filter((r) => r.status === "undecided").length;
      return { attending, not_attending, undecided, total: list.length };
    },
  };

  return store;
}

function countAttending(eventId: string, responses: Map<string, ResponseRecord>): number {
  return Array.from(responses.values()).filter((r) => r.eventId === eventId && r.status === "attending").length;
}

function countAttendingExcluding(eventId: string, name: string, responses: Map<string, ResponseRecord>): number {
  return Array.from(responses.values()).filter(
    (r) => r.eventId === eventId && r.status === "attending" && r.name.trim().toLowerCase() !== name.trim().toLowerCase(),
  ).length;
}

export function eventWithCounts(event: Event, store: EventStore): EventWithCounts {
  const counts = store.counts(event.id)!;
  return { ...event, counts };
}
