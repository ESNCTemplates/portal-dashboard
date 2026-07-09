"use client";
import { useEffect } from "react";

// Smile Mas Meme / Reaction Library — bucketed view.
// Reactions are grouped into buckets (shock, side-eye, ...). Each bucket can
// hold multiple GIF variants, each with Tone / When To Use / Character Fit so
// the video AI can pick the best-fitting one. Search Giphy to ADD a new variant
// to a bucket, or REPLACE the GIF on an existing row.

export default function Page() {
  useEffect(() => {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    let ITEMS = [], filter = "ALL";

    function statusBadgeClass(status) {
      if (status === "active") return "badge badge-active";
      if (status === "needed") return "badge badge-needed";
      return "badge badge-candidate";
    }

    function card(it) {
      const thumb = it.gifThumb
        ? '<img class="thumb" src="' + esc(it.gifThumb) + '" alt="' + esc(it.altText || it.title) + '" loading="lazy" />'
        : '<div class="thumb thumb-empty">No GIF yet</div>';
      const tone = it.tone ? '<span class="tag tone">' + esc(it.tone) + "</span>" : "";
      const senders = it.allowedSenders ? '<span class="tag">Senders: ' + esc(it.allowedSenders) + "</span>" : "";
      const when = it.whenToUse ? '<div class="when"><b>When:</b> ' + esc(it.whenToUse) + "</div>" : "";
      const fit = it.characterFit ? '<div class="fit"><b>Fit:</b> ' + esc(it.characterFit) + "</div>" : "";
      const replaceBtn = '<button class="btn small replace ghost" data-id="' + it.id +
        '" data-q="' + esc(it.bucket || it.emotionTag || it.title) + '">' +
        (it.status === "active" ? "Replace GIF" : "Find GIF") + "</button>";
      return (
        '<div class="mcard">' +
          thumb +
          '<div class="mbody">' +
            '<div class="mtitle">' + esc(it.title) +
              '<span class="' + statusBadgeClass(it.status) + '">' + esc(it.status) + "</span></div>" +
            '<div class="mmeta">' + tone + senders + "</div>" +
            when + fit +
            replaceBtn +
          "</div>" +
        "</div>"
      );
    }

    function bucketSection(name, arr) {
      const cards = arr.map(card).join("");
      const activeN = arr.filter((i) => i.status === "active").length;
      return (
        '<section class="bucket">' +
          '<div class="bucket-head">' +
            '<h2 class="bucket-name">' + esc(name) + "</h2>" +
            '<span class="bucket-count">' + arr.length + " variant" + (arr.length === 1 ? "" : "s") +
              " · " + activeN + " active</span>" +
            '<button class="btn small add" data-bucket="' + esc(name) + '" data-q="' + esc(name) + '">+ Add variant</button>' +
          "</div>" +
          '<div class="grid">' + cards + "</div>" +
        "</section>"
      );
    }

    function groupByBucket(items) {
      const m = {};
      items.forEach((it) => {
        const b = it.bucket || "(no bucket)";
        (m[b] = m[b] || []).push(it);
      });
      return m;
    }

    function render() {
      const list = filter === "ALL" ? ITEMS : ITEMS.filter((i) => i.status === filter);
      const groups = groupByBucket(list);
      const names = Object.keys(groups).sort();
      $("n-total").textContent = ITEMS.length;
      $("n-active").textContent = ITEMS.filter((i) => i.status === "active").length;
      $("n-needed").textContent = ITEMS.filter((i) => i.status === "needed").length;
      $("n-buckets").textContent = new Set(ITEMS.map((i) => i.bucket || "(no bucket)")).size;
      $("grid-root").innerHTML = names.length
        ? names.map((n) => bucketSection(n, groups[n])).join("")
        : '<div class="empty">No reactions in this filter.</div>';
      $("grid-root").querySelectorAll(".add").forEach((btn) => {
        btn.addEventListener("click", () => openPicker("add", { bucket: btn.dataset.bucket, query: btn.dataset.q }));
      });
      $("grid-root").querySelectorAll(".replace").forEach((btn) => {
        btn.addEventListener("click", () => openPicker("replace", { rowId: Number(btn.dataset.id), query: btn.dataset.q }));
      });
    }

    function wireFilters() {
      const bar = $("filterbar");
      bar.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
        bar.querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
        c.classList.add("on"); filter = c.dataset.s; render();
      }));
    }

    let loading = false;
    async function load() {
      if (loading) return; loading = true;
      const rf = $("refresh"); if (rf) rf.disabled = true;
      $("refreshed").textContent = "Refreshing...";
      try {
        const r = await fetch("/api/memes", { cache: "no-store" });
        if (r.status === 401) { window.location.href = "/login"; return; }
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        ITEMS = d.items || [];
        $("loading").classList.add("hidden"); $("error").classList.add("hidden"); $("content").classList.remove("hidden");
        $("refreshed").textContent = "Updated " + new Date(d.updated).toLocaleString();
        render();
      } catch (e) {
        $("loading").classList.add("hidden");
        const eb = $("error"); eb.classList.remove("hidden");
        eb.textContent = "Could not load the library:\n" + ((e && e.message) || e);
        $("refreshed").textContent = "Refresh failed";
      } finally { loading = false; if (rf) rf.disabled = false; }
    }

    let pickerMode = "add";     // "add" | "replace"
    let currentRowId = null;
    let currentBucket = null;

    function openPicker(mode, { rowId, bucket, query }) {
      pickerMode = mode;
      currentRowId = rowId != null ? rowId : null;
      currentBucket = bucket || null;
      $("picker-title").textContent = mode === "add"
        ? "Add a variant to “" + (bucket || "") + "”"
        : "Replace GIF";
      // Tone + When-to-use inputs only matter when adding a new variant.
      $("picker-add-fields").classList.toggle("hidden", mode !== "add");
      $("picker-tone").value = "";
      $("picker-when").value = "";
      $("picker-search").value = query || "";
      $("picker-results").innerHTML = "";
      $("picker-status").textContent = "";
      $("picker").classList.remove("hidden");
      if (query) searchGiphy(query);
    }
    function closePicker() {
      $("picker").classList.add("hidden");
      currentRowId = null; currentBucket = null;
    }

    async function searchGiphy(q) {
      $("picker-results").innerHTML = '<div class="picker-loading">Searching...</div>';
      try {
        const r = await fetch("/api/giphy?q=" + encodeURIComponent(q), { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Giphy search failed");
        const results = d.results || [];
        $("picker-results").innerHTML = results.length
          ? results.map((g) =>
              '<div class="gresult" data-url="' + esc(g.gifUrl) + '" data-giphyid="' + esc(g.giphyId) + '" data-title="' + esc(g.title) + '">' +
              '<img src="' + esc(g.previewUrl) + '" alt="' + esc(g.title) + '" loading="lazy"/></div>'
            ).join("")
          : '<div class="picker-empty">No results - try a different search.</div>';
        $("picker-results").querySelectorAll(".gresult").forEach((el) => {
          el.addEventListener("click", () => saveGif(el.dataset.url, el.dataset.giphyid, el.dataset.title));
        });
      } catch (e) {
        $("picker-results").innerHTML = "";
        $("picker-status").textContent = "Search error: " + ((e && e.message) || e);
      }
    }

    async function saveGif(gifUrl, giphyId, title) {
      let payload;
      if (pickerMode === "add") {
        if (!currentBucket) return;
        payload = {
          action: "add_variant",
          bucket: currentBucket,
          gifUrl, giphyId, altText: title,
          tone: $("picker-tone").value || undefined,
          whenToUse: $("picker-when").value || undefined,
        };
      } else {
        if (!currentRowId) return;
        payload = { action: "attach_gif", rowId: currentRowId, gifUrl, giphyId, altText: title };
      }
      $("picker-status").textContent = "Saving...";
      try {
        const r = await fetch("/api/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Save failed");
        $("picker-status").textContent = "Saved";
        setTimeout(() => { closePicker(); load(); }, 500);
      } catch (e) {
        $("picker-status").textContent = "Save error: " + ((e && e.message) || e);
      }
    }

    const rf = $("refresh"); if (rf) rf.addEventListener("click", () => load());
    const lo = $("logout"); if (lo) lo.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" }); window.location.href = "/login";
    });
    $("picker-close").addEventListener("click", closePicker);
    $("picker-go").addEventListener("click", () => searchGiphy($("picker-search").value));
    $("picker-search").addEventListener("keydown", (e) => { if (e.key === "Enter") searchGiphy($("picker-search").value); });

    wireFilters();
    load();
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Smile Mas Meme Library</h1>
          <div className="sub">Reaction GIFs grouped by bucket — live from Baserow</div>
        </div>
        <div className="topright">
          <span className="refreshed" id="refreshed">Loading...</span>
          <a className="btn" href="/dashboard">Dashboard</a>
          <button className="btn" id="refresh">Refresh</button>
          <button className="btn" id="logout">Log out</button>
        </div>
      </header>

      <div id="content" className="hidden">
        <div className="kpis">
          <div className="kpi"><div className="n" id="n-buckets">0</div><div className="l">Buckets</div></div>
          <div className="kpi"><div className="n" id="n-total">0</div><div className="l">Total variants</div></div>
          <div className="kpi"><div className="n" id="n-active">0</div><div className="l">Active</div></div>
          <div className="kpi"><div className="n" id="n-needed">0</div><div className="l">Needed</div></div>
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
          <div id="picker-add-fields" className="picker-add-fields">
            <select id="picker-tone" className="picker-input">
              <option value="">Tone (optional)</option>
              <option value="comedic">comedic</option>
              <option value="dramatic">dramatic</option>
              <option value="wholesome">wholesome</option>
              <option value="sarcastic">sarcastic</option>
              <option value="playful">playful</option>
            </select>
            <input id="picker-when" className="picker-input" placeholder="When to use this one (optional)" />
          </div>
          <div className="picker-status" id="picker-status"></div>
          <div className="picker-results" id="picker-results"></div>
        </div>
      </div>
    </div>
  );
}
