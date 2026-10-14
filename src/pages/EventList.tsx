import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { EventWithCounts } from "../../shared/types";

export default function EventList() {
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("failed");
      setEvents(await res.json());
    } catch (e) {
      setError("読み込みに失敗しました");
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1>イベント一覧</h1>
      {error && <p className="error">{error}</p>}
      <ul>
        {events.map((ev) => (
          <li key={ev.id}>
            <Link to={`/events/${ev.id}`}>
              <strong>{ev.title}</strong>
            </Link>
            <div>
              開催: {new Date(ev.dateTime).toLocaleString()} / 定員: {ev.counts.attending}/{ev.capacity} / 締切: {new Date(ev.deadline).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
      {events.length === 0 && <p>イベントがありません。</p>}
    </div>
  );
}
