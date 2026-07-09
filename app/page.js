"use client";
import { useEffect } from "react";

// Smile Mas Meme Library — browse, filter, and organize reaction variants by bucket.
export default function Page() {
  useEffect(() => {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    let ITEMS = [];
    const state = { q: "", bucket: "ALL", tone: "ALL", source: "ALL", status: "ALL", sort: "bucket" };
    const collapsed = new Set();

    function badge(status) {
      const c = status === "active" ? "badge-active" : status === "needed" ? "badge-needed" : "badge-candidate";
      return '<span class="badge ' + c + '">' + esc(status) + "</span>";
    }

    function card(it) {
      const thumb = it.gifThumb
        ? '<img class="thumb" src="' + esc(it.gifThumb) + '" alt="' + esc(it.altText || it.title) + '" loading="lazy"/>'
        : '<div class="thumb thumb-empty">' + (it.jobStatus === "queued" ? "Queued" : "No GIF yet") + "</div>";
      const tone = it.tone ? '<span class="tag tone">' + esc(it.tone) + "</span>" : "";
      const src = it.source ? '<span class="tag src ' + esc(it.source) + '">' + esc(it.source) + "</span>" : "";
      const when = it.whenToUse ? '<div class="when"><b>When:</b> ' + esc(it.whenToUse) + "</div>" : "";
      const fit = it.characterFit ? '<div class="fit"><b>Fit:</b> ' + esc(it.characterFit) + "</div>" : "";
      const btn = '<button class="btn small replace ghost" data-id="' + it.id +
        '" data-q="' + esc(it.bucket || it.emotionTag || it.title) + '">' +
        (it.status === "active" ? "Replace GIF" : "Find GIF") + "</button>";
      return '<div class="mcard">' + thumb + '<div class="mbody">' +
        '<div class="mtitle">' + esc(it.title) + badge(it.status) + "</div>" +
        '<div class="mmeta">' + tone + src + "</div>" + when + fit + btn + "</div></div>";
    }

    function passes(it) {
      if (state.bucket !== "ALL" && it.bucket !== state.bucket) return false;
      if (state.tone !== "ALL" && it.tone !== state.tone) return false;
      if (state.source !== "ALL" && (it.source || "") !== state.source) return false;
      if (state.status !== "ALL" && it.status !== state.status) return false;
      if (state.q) {
        const hay = (it.title + " " + it.bucket + " " + it.tone + " " + it.whenToUse + " " +
          it.characterFit + " " + it.altText).toLowerCase();
        if (!hay.includes(state.q.toLowerCase())) return false;
      }
      return true;
    }

    function render() {
      const list = ITEMS.filter(passes);
      const groups = {};
      list.forEach((it) => { (groups[it.bucket || "(no bucket)"] = groups[it.bucket || "(no bucket)"] || []).push(it); });
      let names = Object.keys(groups);
      const activeOf = (n) => groups[n].filter((i) => i.status === "active").length;
      if (state.sort === "count") names.sort((a, b) => groups[b].length - groups[a].length);
      else if (state.sort === "needed") names.sort((a, b) => activeOf(a) - activeOf(b));
      else names.sort();

      $("n-buckets").textContent = new Set(ITEMS.map((i) => i.bucket || "(no bucket)")).size;
      $("n-total").textContent = ITEMS.length;
      $("n-shown").textContent = list.length;
      $("n-made").textContent = ITEMS.filter((i) => i.source === "made").length;

      $("grid-root").innerHTML = names.length ? names.map((n) => {
        const arr = groups[n];
        const isC = collapsed.has(n);
        const caret = isC ? "▸" : "▾";
        return '<section class="bucket">' +
          '<div class="bucket-head" data-bucket="' + esc(n) + '">' +
            '<span class="caret">' + caret + "</span>" +
            '<h2 class="bucket-name">' + esc(n) + "</h2>" +
            '<span class="bucket-count">' + arr.length + " variant" + (arr.length === 1 ? "" : "s") +
              " · " + activeOf(n) + " active</span>" +
            '<button class="btn small add" data-bucket="' + esc(n) + '" data-q="' + esc(n) + '">+ Add variant</button>' +
          "</div>" +
          (isC ? "" : '<div class="grid">' + arr.map(card).join("") + "</div>") +
        "</section>";
      }).join("") : '<div class="empty">No variants match these filters.</div>';

      // wire
      $("grid-root").querySelectorAll(".bucket-head").forEach((h) => h.addEventListener("click", (e) => {
        if (e.target.closest(".add")) return;
        const n = h.dataset.bucket; collapsed.has(n) ? collapsed.delete(n) : collapsed.add(n); render();
      }));
      $("grid-root").querySelectorAll(".add").forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation(); openPicker("add", { bucket: b.dataset.bucket, query: b.dataset.q });
      }));
      $("grid-root").querySelectorAll(".replace").forEach((b) => b.addEventListener("click", () =>
        openPicker("replace", { rowId: Number(b.dataset.id), query: b.dataset.q })));
    }

    function fillFilters() {
      const uniq = (key) => [...new Set(ITEMS.map((i) => i[key]).filter(Boolean))].sort();
      const opt = (v) => '<option value="' + esc(v) + '">' + esc(v) + "</option>";
      $("f-bucket").innerHTML = '<option value="ALL">All buckets</option>' + uniq("bucket").map(opt).join("");
      $("f-tone").innerHTML = '<option value="ALL">All tones</option>' + uniq("tone").map(opt).join("");
    }

    function wireControls() {
      $("lib-search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
      $("f-bucket").addEventListener("change", (e) => { state.bucket = e.target.value; render(); });
      $("f-tone").addEventListener("change", (e) => { state.tone = e.target.value; render(); });
      $("f-source").addEventListener("change", (e) => { state.source = e.target.value; render(); });
      $("f-sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
      $("filterbar").querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
        $("filterbar").querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
        c.classList.add("on"); state.status = c.dataset.s; render();
      }));
      $("collapse-all").addEventListener("click", () => {
        new Set(ITEMS.map((i) => i.bucket || "(no bucket)")).forEach((n) => collapsed.add(n)); render();
      });
      $("expand-all").addEventListener("click", () => { collapsed.clear(); render(); });
    }

    let loading = false;
    async function load() {
      if (loading) return; loading = true;
      $("refreshed").textContent = "Refreshing...";
      try {
        const r = await fetch("/api/memes", { cache: "no-store" });
        if (r.status === 401) { window.location.href = "/login"; return; }
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        ITEMS = d.items || [];
        $("loading").classList.add("hidden"); $("content").classList.remove("hidden");
        $("refreshed").textContent = "Updated " + new Date(d.updated).toLocaleString();
        fillFilters(); render();
      } catch (e) {
        $("loading").classList.add("hidden");
        const eb = $("error"); eb.classList.remove("hidden");
        eb.textContent = "Could not load: " + ((e && e.message) || e);
      } finally { loading = false; }
    }

    // ---- Giphy picker (add variant / replace) ----
    let mode = "add", curRow = null, curBucket = null;
    function openPicker(m, { rowId, bucket, query }) {
      mode = m; curRow = rowId != null ? rowId : null; curBucket = bucket || null;
      $("picker-title").textContent = m === "add" ? "Add a variant to “" + (bucket || "") + "”" : "Replace GIF";
      $("picker-search").value = query || ""; $("picker-results").innerHTML = ""; $("picker-status").textContent = "";
      $("picker").classList.remove("hidden"); if (query) searchGiphy(query);
    }
    function closePicker() { $("picker").classList.add("hidden"); curRow = null; curBucket = null; }
    async function searchGiphy(q) {
      $("picker-results").innerHTML = '<div class="picker-loading">Searching...</div>';
      try {
        const r = await fetch("/api/giphy?q=" + encodeURIComponent(q), { cache: "no-store" });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || "Giphy failed");
        const res = d.results || [];
        $("picker-results").innerHTML = res.length ? res.map((g) =>
          '<div class="gresult" data-url="' + esc(g.gifUrl) + '" data-giphyid="' + esc(g.giphyId) + '" data-title="' + esc(g.title) + '">' +
          '<img src="' + esc(g.previewUrl) + '" alt="' + esc(g.title) + '" loading="lazy"/></div>').join("")
          : '<div class="picker-empty">No results.</div>';
        $("picker-results").querySelectorAll(".gresult").forEach((el) => el.addEventListener("click", () =>
          save(el.dataset.url, el.dataset.giphyid, el.dataset.title)));
      } catch (e) { $("picker-results").innerHTML = ""; $("picker-status").textContent = "Error: " + ((e && e.message) || e); }
    }
    async function save(gifUrl, giphyId, title) {
      const payload = mode === "add"
        ? { action: "add_variant", bucket: curBucket, gifUrl, giphyId, altText: title }
        : { action: "attach_gif", rowId: curRow, gifUrl, giphyId, altText: title };
      if (mode === "add" && !curBucket) return; if (mode === "replace" && !curRow) return;
      $("picker-status").textContent = "Saving...";
      try {
        const r = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || "Save failed");
        $("picker-status").textContent = "Saved"; setTimeout(() => { closePicker(); load(); }, 500);
      } catch (e) { $("picker-status").textContent = "Error: " + ((e && e.message) || e); }
    }

    $("refresh").addEventListener("click", load);
    $("logout").addEventListener("click", async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; });
    $("picker-close").addEventListener("click", closePicker);
    $("picker-go").addEventListener("click", () => searchGiphy($("picker-search").value));
    $("picker-search").addEventListener("keydown", (e) => { if (e.key === "Enter") searchGiphy($("picker-search").value); });

    wireControls(); load();
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Smile Mas Meme Library</h1>
          <div className="sub">Reaction variants grouped by bucket — live from Baserow</div>
        </div>
        <div className="topright">
          <span className="refreshed" id="refreshed">Loading...</span>
          <button className="btn" id="refresh">↻ Refresh</button>
          <button className="btn" id="logout">Log out</button>
        </div>
      </header>

      <nav className="tabs">
        <a className="tab on" href="/">Library</a>
        <a className="tab" href="/create">Create</a>
        <a className="tab" href="/dashboard">Dashboard</a>
      </nav>

      <div id="content" className="hidden">
        <div className="kpis">
          <div className="kpi"><div className="n" id="n-buckets">0</div><div className="l">Buckets</div></div>
          <div className="kpi"><div className="n" id="n-total">0</div><div className="l">Variants</div></div>
          <div className="kpi"><div className="n" id="n-shown">0</div><div className="l">Showing</div></div>
          <div className="kpi"><div className="n" id="n-made">0</div><div className="l">Made</div></div>
        </div>

        <div className="controls">
          <input id="lib-search" className="search" placeholder="Search title, keywords, when-to-use..." />
          <select id="f-bucket" className="sel"></select>
          <select id="f-tone" className="sel"></select>
          <select id="f-source" className="sel">
            <option value="ALL">All sources</option><option value="found">found</option><option value="made">made</option>
          </select>
          <select id="f-sort" className="sel">
            <option value="bucket">Sort: A–Z</option>
            <option value="count">Sort: most variants</option>
            <option value="needed">Sort: most needed</option>
          </select>
          <button className="btn small" id="collapse-all">Collapse all</button>
          <button className="btn small" id="expand-all">Expand all</button>
        </div>
        <div className="bar" id="filterbar">
          <span className="label">Status:</span>
          <span className="chip on" data-s="ALL">All</span>
          <span className="chip" data-s="active">Active</span>
          <span className="chip" data-s="needed">Needed</span>
          <span className="chip" data-s="candidate">Candidate</span>
        </div>
        <div id="grid-root"></div>
      </div>
      <div id="loading" className="loading">Loading...</div>
      <div id="error" className="err-box hidden"></div>

      <div id="picker" className="picker hidden">
        <div className="picker-card">
          <div className="picker-title" id="picker-title">Add a variant</div>
          <div className="picker-head">
            <input id="picker-search" placeholder="Search Giphy..." />
            <button className="btn" id="picker-go">Search</button>
            <button className="btn ghost" id="picker-close">Close</button>
          </div>
          <div className="picker-status" id="picker-status"></div>
          <div className="picker-results" id="picker-results"></div>
        </div>
      </div>
    </div>
  );
}
