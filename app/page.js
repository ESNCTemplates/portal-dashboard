"use client";
import { useEffect, useState, useMemo, useCallback } from "react";

// ---- EDIT THIS PAGE ----
// Renderer-based dashboard: fetch /api/data, group items, render with REAL JSX components.
// No innerHTML, no hand-rolled esc() — React escapes every interpolation by default.

function safeHref(url) {
  // Allow only http/https/mailto — blocks javascript: and data: URLs at the source.
  try {
    const u = new URL(url, "https://example.invalid");
    return ["http:", "https:", "mailto:"].includes(u.protocol) ? url : "#";
  } catch { return "#"; }
}

function Card({ item }) {
  const badges = [item.group, item.status].filter(Boolean);
  return (
    <div className="card">
      <div>
        <div className="title">{item.title}</div>
        {badges.length > 0 && (
          <div className="meta">
            {badges.map((b, i) => <span className="badge" key={i}>{b}</span>)}
          </div>
        )}
      </div>
      {item.url && (
        <a className="open" href={safeHref(item.url)} target="_blank" rel="noopener noreferrer">Open ↗</a>
      )}
    </div>
  );
}

function Group({ name, items }) {
  return (
    <div className="grp">
      <h2>{name} <span className="count">{items.length}</span></h2>
      <div className="cards">{items.map((it, i) => <Card item={it} key={it.id ?? i} />)}</div>
    </div>
  );
}

function FilterBar({ groups, active, onPick }) {
  return (
    <div className="bar">
      <span className="label">Group:</span>
      {["ALL", ...groups].map((g) => (
        <span key={g} className={"chip" + (active === g ? " on" : "")} onClick={() => onPick(g)}>
          {g === "ALL" ? "All" : g}
        </span>
      ))}
    </div>
  );
}

export default function Page() {
  const [items, setItems] = useState([]);
  const [updated, setUpdated] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errMsg, setErrMsg] = useState("");
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    setStatus((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/login"; return; }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");
      setItems(d.items || []);
      setUpdated(d.updated || Date.now());
      setStatus("ready");
    } catch (e) {
      setErrMsg((e && e.message) || String(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(
    () => Array.from(new Set(items.map((i) => i.group || "Ungrouped"))).sort(), [items]);

  const visible = useMemo(
    () => (filter === "ALL" ? items : items.filter((i) => (i.group || "Ungrouped") === filter)),
    [items, filter]);

  const grouped = useMemo(() => {
    const g = {};
    for (const it of visible) (g[it.group || "Ungrouped"] ||= []).push(it);
    return Object.keys(g).sort().map((k) => [k, g[k]]);
  }, [visible]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Portal Dashboard</h1>
          <div className="sub">Live, read-only view from Baserow</div>
        </div>
        <div className="topright">
          <span className="refreshed">
            {status === "loading" && "Refreshing…"}
            {status === "error" && "Refresh failed"}
            {status === "ready" && updated &&
              `Updated ${new Date(updated).toLocaleString()} · ${items.length} items`}
          </span>
          <button className="btn" onClick={load} disabled={status === "loading"}>↻ Refresh</button>
          <button className="btn" onClick={logout}>Log out</button>
        </div>
      </header>

      {status === "loading" && items.length === 0 && <div className="loading">Loading…</div>}
      {status === "error" && <div className="err-box">Could not load data:{"\n"}{errMsg}</div>}

      {items.length > 0 && (
        <div>
          <div className="kpis">
            <div className="kpi"><div className="n">{visible.length}</div><div className="l">Total</div></div>
          </div>
          <FilterBar groups={groups} active={filter} onPick={setFilter} />
          {grouped.length > 0
            ? grouped.map(([name, its]) => <Group name={name} items={its} key={name} />)
            : <div className="empty">No items.</div>}
        </div>
      )}
    </div>
  );
}
