import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { EventWithCounts, ResponseHistoryRecord, ResponseRecord } from "../../shared/types";

const LABELS: Record<string, string> = {
  attending: "参加",
  not_attending: "不参加",
  undecided: "未定",
};

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [history, setHistory] = useState<ResponseHistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(() => localStorage.getItem("rsvp-name") || "");
  const [status, setStatus] = useState("attending");
  const [msg, setMsg] = useState<string | null>(null);
  const [newCapacity, setNewCapacity] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const evRes = await fetch(`/api/events/${id}`);
      if (!evRes.ok) throw new Error("event not found");
      const ev = await evRes.json();
      setEvent(ev);
      setNewCapacity(ev.capacity);
      const rsRes = await fetch(`/api/events/${id}/responses`);
      if (rsRes.ok) setResponses(await rsRes.json());
      const histRes = await fetch(`/api/events/${id}/history`);
      if (histRes.ok) setHistory(await histRes.json());
    } catch (e: any) {
      setError(e.message || "読み込みに失敗しました");
    }
  };

  useEffect(() => { load(); }, [id]);

  const closed = event ? new Date() > new Date(event.deadline) : false;

  const submitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      localStorage.setItem("rsvp-name", name);
      const res = await fetch(`/api/events/${id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "送信に失敗しました");
      setMsg("回答を登録しました");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}/capacity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity: Number(newCapacity) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "更新に失敗しました");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !event) return <div className="card"><p className="error">{error}</p></div>;
  if (!event) return <div className="card">読み込み中...</div>;

  return (
    <div>
      <div className="card">
        <h1>{event.title}</h1>
        <p>開催日時: {new Date(event.dateTime).toLocaleString()}</p>
        <p>締め切り: {new Date(event.deadline).toLocaleString()} {closed && <span className="error">(締切済み)</span>}</p>
        <p>定員: {event.counts.attending} / {event.capacity}</p>
        <p>
          集計: 参加 {event.counts.attending} / 不参加 {event.counts.not_attending} / 未定 {event.counts.undecided}
        </p>
      </div>

      <div className="card">
        <h2>出欠を回答</h2>
        {!closed ? (
          <form onSubmit={submitResponse}>
            <label>名前</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
            <label>回答</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="attending">参加</option>
              <option value="not_attending">不参加</option>
              <option value="undecided">未定</option>
            </select>
            {msg && <p className="success">{msg}</p>}
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? "送信中..." : "回答する"}</button>
          </form>
        ) : (
          <p className="error">締め切りを過ぎたため回答できません。</p>
        )}
      </div>

      <div className="card">
        <h2>定員を増やす（主催者）</h2>
        <form onSubmit={submitCapacity}>
          <label>新しい定員</label>
          <input type="number" min={event.capacity} value={newCapacity} onChange={(e) => setNewCapacity(Number(e.target.value))} />
          <button type="submit" disabled={busy}>更新</button>
        </form>
      </div>

      <div className="card">
        <h2>回答履歴（変更履歴）</h2>
        <ul>
          {history.map((h) => (
            <li key={h.id}>
              {new Date(h.changedAt).toLocaleString()} / {h.name}: {h.previousStatus ? LABELS[h.previousStatus] ?? h.previousStatus : "-"} → {LABELS[h.newStatus] ?? h.newStatus}（変更者: {h.changedBy}）
            </li>
          ))}
        </ul>
        {history.length === 0 && <p>まだ履歴がありません。</p>}
      </div>

      <div className="card">
        <h2>回答一覧</h2>
        <ul>
          {responses.map((r) => (
            <li key={r.id}>{r.name}: {LABELS[r.status] ?? r.status}</li>
          ))}
        </ul>
        {responses.length === 0 && <p>まだ回答がありません。</p>}
      </div>
    </div>
  );
}
