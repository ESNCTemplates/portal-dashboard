"use client";
import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) window.location.href = "/";
      else { setErr(d.error || "Login failed."); setBusy(false); }
    } catch { setErr("Network error."); setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>Portal</h1>
        <p>Enter the access password to continue.</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus />
        <button type="submit" disabled={busy}>{busy ? "Checking…" : "Enter"}</button>
        <div className="login-err">{err}</div>
      </form>
    </div>
  );
}
