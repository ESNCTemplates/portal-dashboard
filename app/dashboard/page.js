"use client";
import { useEffect } from "react";

// Meme Library health dashboard — read-only view over /api/memes (table 5209).
// Shows bucket coverage, status/tone breakdowns, and what needs attention.

export default function Dashboard() {
  useEffect(() => {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    function bar(pct, cls) {
      return '<div class="pbar"><div class="pfill ' + (cls || "") + '" style="width:' + Math.round(pct) + '%"></div></div>';
    }

    function render(items) {
      const buckets = {};
      items.forEach((it) => {
        const b = it.bucket || "(no bucket)";
        (buckets[b] = buckets[b] || []).push(it);
      });
      const names = Object.keys(buckets).sort();
      const totalVariants = items.length;
      const active = items.filter((i) => i.status === "active").length;
      const needed = items.filter((i) => i.status === "needed").length;
      const coveredBuckets = names.filter((n) => buckets[n].some((i) => i.status === "active"));
      const coverage = names.length ? (coveredBuckets.length / names.length) * 100 : 0;

      // KPIs
      $("k-buckets").textContent = names.length;
      $("k-variants").textContent = totalVariants;
      $("k-active").textContent = active;
      $("k-coverage").textContent = Math.round(coverage) + "%";

      // Per-bucket coverage
      $("bucket-rows").innerHTML = names.map((n) => {
        const arr = buckets[n];
        const a = arr.filter((i) => i.status === "active").length;
        const missingMeta = arr.filter((i) => !i.tone || !i.whenToUse).length;
        const warn = a === 0 ? '<span class="pill warn">needs GIF</span>' : "";
        const metaWarn = missingMeta ? '<span class="pill soft">' + missingMeta + " missing meta</span>" : "";
        return (
          '<tr>' +
            '<td class="bname">' + esc(n) + "</td>" +
            '<td class="num">' + arr.length + "</td>" +
            '<td class="num">' + a + "</td>" +
            '<td class="cov">' + bar(arr.length ? (a / arr.length) * 100 : 0, a ? "" : "empty") + "</td>" +
            "<td>" + warn + metaWarn + "</td>" +
          "</tr>"
        );
      }).join("");

      // Distributions
      const dist = (key) => {
        const m = {};
        items.forEach((i) => { const v = i[key] || "(none)"; m[v] = (m[v] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
      };
      const distHtml = (pairs) => pairs.map(([k, v]) =>
        '<div class="drow"><span class="dk">' + esc(k) + '</span>' +
        bar((v / Math.max(1, totalVariants)) * 100) +
        '<span class="dv">' + v + "</span></div>").join("");
      $("tone-dist").innerHTML = distHtml(dist("tone"));
      $("status-dist").innerHTML = distHtml(dist("status"));

      // Needs attention
      const emptyBuckets = names.filter((n) => !buckets[n].some((i) => i.status === "active"));
      const noMeta = items.filter((i) => i.status === "active" && (!i.tone || !i.whenToUse));
      const na = [];
      if (emptyBuckets.length) na.push("<li><b>" + emptyBuckets.length + " bucket(s) with no active GIF:</b> " + emptyBuckets.map(esc).join(", ") + "</li>");
      if (noMeta.length) na.push("<li><b>" + noMeta.length + " active variant(s) missing Tone or When-To-Use</b> (weakens AI selection)</li>");
      $("attention").innerHTML = na.length ? na.join("") : '<li class="ok">Everything looks healthy.</li>';
    }

    async function load() {
      $("updated").textContent = "Loading...";
      try {
        const r = await fetch("/api/memes", { cache: "no-store" });
        if (r.status === 401) { window.location.href = "/login"; return; }
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        render(d.items || []);
        $("dash").classList.remove("hidden"); $("dloading").classList.add("hidden");
        $("updated").textContent = "Updated " + new Date(d.updated).toLocaleString();
      } catch (e) {
        $("dloading").classList.add("hidden");
        const eb = $("derror"); eb.classList.remove("hidden");
        eb.textContent = "Could not load: " + ((e && e.message) || e);
      }
    }
    const rf = $("drefresh"); if (rf) rf.addEventListener("click", load);
    load();
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Meme Library — Dashboard</h1>
          <div className="sub">Health of SM_Meme_Library (table 5209) — live from Baserow</div>
        </div>
        <div className="topright">
          <span className="refreshed" id="updated">Loading...</span>
          <a className="btn" href="/">← Library</a>
          <button className="btn" id="drefresh">↻ Refresh</button>
        </div>
      </header>

      <nav className="tabs">
        <a className="tab" href="/">Library</a>
        <a className="tab" href="/create">Create</a>
        <a className="tab on" href="/dashboard">Dashboard</a>
      </nav>

      <div id="dloading" className="loading">Loading...</div>
      <div id="derror" className="err-box hidden"></div>

      <div id="dash" className="hidden">
        <div className="kpis">
          <div className="kpi"><div className="n" id="k-buckets">0</div><div className="l">Buckets</div></div>
          <div className="kpi"><div className="n" id="k-variants">0</div><div className="l">Total variants</div></div>
          <div className="kpi"><div className="n" id="k-active">0</div><div className="l">Active GIFs</div></div>
          <div className="kpi"><div className="n" id="k-coverage">0%</div><div className="l">Bucket coverage</div></div>
        </div>

        <div className="dgrid">
          <section className="panel wide">
            <h2>Bucket coverage</h2>
            <table className="btable">
              <thead><tr><th>Bucket</th><th>Variants</th><th>Active</th><th>Fill</th><th></th></tr></thead>
              <tbody id="bucket-rows"></tbody>
            </table>
          </section>
          <section className="panel">
            <h2>By tone</h2><div id="tone-dist"></div>
            <h2 style={{ marginTop: 16 }}>By status</h2><div id="status-dist"></div>
          </section>
        </div>

        <section className="panel">
          <h2>Needs attention</h2>
          <ul id="attention" className="attention"></ul>
        </section>
      </div>
    </div>
  );
}
