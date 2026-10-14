import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EventCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dateTime: new Date(dateTime).toISOString(),
          capacity: Number(capacity),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "作成に失敗しました");
      }
      const event = await res.json();
      navigate(`/events/${event.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h1>イベントを作成</h1>
      <form onSubmit={submit}>
        <label>タイトル</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>開催日時</label>
        <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
        <label>定員</label>
        <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
        <p>締め切りは開催日の前日23:59に自動設定されます。</p>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "作成中..." : "作成"}</button>
      </form>
    </div>
  );
}
