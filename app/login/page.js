"use client";
import { useState } from "react";
export default function Login() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) window.location.href = "/"; else setErr("Wrong password");
  }
  return (
    <div style={{ maxWidth: 320, margin: "18vh auto", fontFamily: "system-ui", color: "#e8eaed" }}>
      <h1 style={{ fontSize: 20 }}>Portal</h1>
      <form onSubmit={submit}>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password"
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #2a2f3a", background: "#171a21", color: "#e8eaed" }} />
        <button style={{ marginTop: 10, width: "100%", padding: 10, borderRadius: 8, border: "1px solid #5b8def", background: "#5b8def", color: "#0d0f13", cursor: "pointer" }}>Enter</button>
        {err && <div style={{ color: "#f3b3b3", marginTop: 8 }}>{err}</div>}
      </form>
    </div>
  );
}
