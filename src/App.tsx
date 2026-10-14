import { Routes, Route, Link } from "react-router-dom";
import EventList from "./pages/EventList";
import EventCreate from "./pages/EventCreate";
import EventDetail from "./pages/EventDetail";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/">イベント一覧</Link>
        <Link to="/events/new" className="primary">新規イベント作成</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<EventList />} />
          <Route path="/events/new" element={<EventCreate />} />
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </main>
    </div>
  );
}
