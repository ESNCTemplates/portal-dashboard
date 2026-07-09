"use client";
import { useEffect } from "react";

// Create tab: add a found GIF (Giphy) to a bucket, or enqueue a "made" generation job.
export default function Create() {
  useEffect(() => {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    let BUCKETS = [], CHARS = [];

    async function loadMeta() {
      try {
        const r = await fetch("/api/memes", { cache: "no-store" });
        if (r.status === 401) { window.location.href = "/login"; return; }
        const d = await r.json();
        const items = d.items || [];
        BUCKETS = [...new Set(items.map((i) => i.bucket).filter(Boolean))].sort();
        CHARS = [...new Set(items.map((i) => i.character).filter(Boolean))].sort();
        const bopts = BUCKETS.map((b) => '<option value="' + esc(b) + '">' + esc(b) + "</option>").join("");
        $("find-bucket").innerHTML = bopts;
        $("gen-bucket").innerHTML = bopts + '<option value="__new__">+ New bucket...</option>';
        $("gen-char").setAttribute("list", "charlist");
        $("charlist").innerHTML = CHARS.map((c) => '<option value="' + esc(c) + '">').join("");
      } catch (e) { $("meta-err").textContent = "Could not load buckets: " + ((e && e.message) || e); }
    }

    function switchMode(m) {
      $("tab-find").classList.toggle("on", m === "find");
      $("tab-gen").classList.toggle("on", m === "gen");
      $("panel-find").classList.toggle("hidden", m !== "find");
      $("panel-gen").classList.toggle("hidden", m !== "gen");
    }

    // --- Find (Giphy) ---
    async function searchGiphy(q) {
      $("find-results").innerHTML = '<div class="picker-loading">Searching...</div>';
      try {
        const r = await fetch("/api/giphy?q=" + encodeURIComponent(q), { cache: "no-store" });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || "Giphy failed");
        const res = d.results || [];
        $("find-results").innerHTML = res.length ? res.map((g) =>
          '<div class="gresult" data-url="' + esc(g.gifUrl) + '" data-giphyid="' + esc(g.giphyId) + '" data-title="' + esc(g.title) + '">' +
          '<img src="' + esc(g.previewUrl) + '" alt="' + esc(g.title) + '" loading="lazy"/></div>').join("")
          : '<div class="picker-empty">No results.</div>';
        $("find-results").querySelectorAll(".gresult").forEach((el) => el.addEventListener("click", () => saveFound(el.dataset)));
      } catch (e) { $("find-results").innerHTML = ""; $("find-status").textContent = "Error: " + ((e && e.message) || e); }
    }
    async function saveFound(ds) {
      const bucket = $("find-bucket").value;
      if (!bucket) { $("find-status").textContent = "Pick a bucket first."; return; }
      $("find-status").textContent = "Saving...";
      try {
        const r = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "add_variant", bucket, gifUrl: ds.url, giphyId: ds.giphyid, altText: ds.title,
            tone: $("find-tone").value || undefined, whenToUse: $("find-when").value || undefined }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || "Save failed");
        $("find-status").textContent = "Saved to “" + bucket + "” ✓";
      } catch (e) { $("find-status").textContent = "Error: " + ((e && e.message) || e); }
    }

    // --- Generate (enqueue job) ---
    function onBucketChange() {
      $("gen-newbucket").classList.toggle("hidden", $("gen-bucket").value !== "__new__");
    }
    async function submitGen() {
      const sel = $("gen-bucket").value;
      const isNew = sel === "__new__";
      const bucket = isNew ? "" : sel;
      const proposedBucket = isNew ? $("gen-newbucket").value.trim() : "";
      if (isNew && !proposedBucket) { $("gen-status").textContent = "Enter a new bucket name."; return; }
      const imagePrompt = $("gen-prompt").value.trim();
      const top = $("gen-top").value.trim(), bottom = $("gen-bottom").value.trim();
      if (!imagePrompt && !top && !bottom) { $("gen-status").textContent = "Add an image prompt or a caption."; return; }
      $("gen-status").textContent = "Queuing...";
      try {
        const r = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "queue_generation", bucket, proposedBucket,
            character: $("gen-char").value.trim() || undefined, tone: $("gen-tone").value || undefined,
            reactionName: $("gen-name").value.trim() || undefined, whenToUse: $("gen-when").value.trim() || undefined,
            topCaption: top || undefined, bottomCaption: bottom || undefined, imagePrompt: imagePrompt || undefined,
            altText: $("gen-alt").value.trim() || undefined }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || "Queue failed");
        $("gen-status").textContent = "Queued as job #" + (d.row && d.row.id) + " (Status: candidate / queued) ✓";
        ["gen-name","gen-top","gen-bottom","gen-prompt","gen-when","gen-alt","gen-newbucket"].forEach((i) => { $(i).value = ""; });
      } catch (e) { $("gen-status").textContent = "Error: " + ((e && e.message) || e); }
    }

    $("tab-find").addEventListener("click", () => switchMode("find"));
    $("tab-gen").addEventListener("click", () => switchMode("gen"));
    $("find-go").addEventListener("click", () => searchGiphy($("find-search").value));
    $("find-search").addEventListener("keydown", (e) => { if (e.key === "Enter") searchGiphy($("find-search").value); });
    $("gen-bucket").addEventListener("change", onBucketChange);
    $("gen-submit").addEventListener("click", submitGen);
    $("logout").addEventListener("click", async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; });
    switchMode("find"); loadMeta();
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div><h1>Create a Meme</h1><div className="sub">Add a found GIF, or enqueue an original to generate</div></div>
        <div className="topright"><button className="btn" id="logout">Log out</button></div>
      </header>
      <nav className="tabs">
        <a className="tab" href="/">Library</a>
        <a className="tab on" href="/create">Create</a>
        <a className="tab" href="/dashboard">Dashboard</a>
      </nav>

      <div className="modebar">
        <button className="modetab on" id="tab-find">Find existing (Giphy)</button>
        <button className="modetab" id="tab-gen">Generate new (enqueue)</button>
      </div>
      <div id="meta-err" className="err-box" style={{ background: "none", color: "#b91c1c" }}></div>

      <section id="panel-find" className="panel">
        <div className="frow">
          <label>Bucket<select id="find-bucket" className="sel"></select></label>
          <label>Tone (optional)<select id="find-tone" className="sel">
            <option value="">—</option><option>comedic</option><option>dramatic</option>
            <option>wholesome</option><option>sarcastic</option><option>playful</option></select></label>
        </div>
        <label className="wlabel">When to use (optional)<input id="find-when" className="in" placeholder="What scene is this variant best for?" /></label>
        <div className="picker-head">
          <input id="find-search" placeholder="Search Giphy..." />
          <button className="btn" id="find-go">Search</button>
        </div>
        <div className="picker-status" id="find-status"></div>
        <div className="picker-results" id="find-results"></div>
      </section>

      <section id="panel-gen" className="panel hidden">
        <div className="frow">
          <label>Bucket<select id="gen-bucket" className="sel"></select></label>
          <input id="gen-newbucket" className="in hidden" placeholder="New bucket name" />
          <label>Character<input id="gen-char" className="in" placeholder="e.g. abuela-lola" /></label>
          <label>Tone<select id="gen-tone" className="sel">
            <option value="">—</option><option>comedic</option><option>dramatic</option>
            <option>wholesome</option><option>sarcastic</option><option>playful</option></select></label>
        </div>
        <datalist id="charlist"></datalist>
        <label className="wlabel">Name (optional)<input id="gen-name" className="in" placeholder="e.g. shock — Abuela zapatos" /></label>
        <div className="frow">
          <label>Caption top<input id="gen-top" className="in" placeholder="CUANDO EL NOVIO" /></label>
          <label>Caption bottom<input id="gen-bottom" className="in" placeholder="LLEGA SIN ZAPATOS" /></label>
        </div>
        <label className="wlabel">Image prompt<textarea id="gen-prompt" className="in ta" rows="4" placeholder="Describe the character, expression, setting, style..."></textarea></label>
        <label className="wlabel">When to use (optional)<input id="gen-when" className="in" placeholder="Scene this meme fits" /></label>
        <label className="wlabel">Alt text (optional)<input id="gen-alt" className="in" placeholder="Short description" /></label>
        <button className="btn primary" id="gen-submit">Queue generation job</button>
        <div className="picker-status" id="gen-status"></div>
        <p className="hint">Enqueues a <b>candidate / queued</b> row (Source: made). The Meme Maker pipeline generates the image and, for a new bucket, creates it.</p>
      </section>
    </div>
  );
}
