"use client";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    const STATUS_CLASS = {
      "Completed": "s-completed", "Departed": "s-departed", "Day-of Ops": "s-dayof",
      "Confirmed": "s-confirmed", "Planning": "s-planning", "Cancelled": "s-cancelled",
    };
    const STATUS_ORDER = ["Planning", "Confirmed", "Day-of Ops", "Departed", "Completed", "Cancelled"];

    let DATA = null, filter = "ALL";

    function kpi(n, label, sub) {
      return '<div class="kpi"><div class="n">' + esc(n) + '</div><div class="l">' + esc(label) + "</div>" +
        (sub ? '<div class="sub2">' + esc(sub) + "</div>" : "") + "</div>";
    }

    // horizontal labeled bars
    function hbars(entries, opts = {}) {
      const max = Math.max(1, ...entries.map((e) => e.value));
      return '<div class="hbars">' + entries.map((e) => {
        const pct = Math.round((e.value / max) * 100);
        const cls = e.cls ? " " + e.cls : "";
        return '<div class="hrow"><div class="hlab">' + esc(e.label) + "</div>" +
          '<div class="htrack"><div class="hfill' + cls + '" style="width:' + pct + '%"></div></div>' +
          '<div class="hval">' + esc(e.value) + (opts.suffix || "") + "</div></div>";
      }).join("") + "</div>";
    }

    // vertical columns (time series)
    function columns(entries) {
      const max = Math.max(1, ...entries.map((e) => e.value));
      return '<div class="cols">' + entries.map((e) => {
        const h = Math.round((e.value / max) * 100);
        const cls = e.cls ? " " + e.cls : "";
        return '<div class="col"><div class="colval">' + esc(e.value) + "</div>" +
          '<div class="colbarwrap"><div class="colbar' + cls + '" style="height:' + Math.max(4, h) + '%"></div></div>' +
          '<div class="collab">' + esc(e.label) + "</div>" +
          '<div class="collab2">' + esc(e.sub || "") + "</div></div>";
      }).join("") + "</div>";
    }

    function card(title, body, note) {
      return '<section class="panel"><h2>' + esc(title) + "</h2>" +
        (note ? '<div class="panel-note">' + esc(note) + "</div>" : "") + body + "</section>";
    }

    function fmtDate(d) {
      if (!d) return "—";
      const dt = new Date(d + "T00:00:00");
      return isNaN(dt) ? d : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    function renderKpis(r) {
      const ontime = r.onTimePct == null ? "—" : r.onTimePct + "%";
      $("kpis").innerHTML =
        kpi(r.totalFlights, "Flights in program") +
        kpi(r.paxCarried, "Passengers carried", r.paxScheduled + " scheduled") +
        kpi(r.activeCount, "Active operations") +
        kpi(r.completedCount, "Completed") +
        kpi(ontime, "On-time departures", r.onTimeReported + " of " + r.reported + " reported") +
        kpi(r.avgBagWait ? r.avgBagWait + "m" : "—", "Avg baggage wait") +
        kpi(r.delayEvents, "Delay events") +
        kpi(r.specialMeals, "Special-meal orders");
    }

    function renderCharts(r) {
      const statusEntries = STATUS_ORDER
        .filter((s) => r.byStatus[s])
        .map((s) => ({ label: s, value: r.byStatus[s], cls: STATUS_CLASS[s] }));
      const routeEntries = Object.entries(r.paxByRoute)
        .sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v }));
      const delayEntries = Object.entries(r.delayByCat)
        .sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, cls: "c-delay" }));
      const timeEntries = r.overTime.map((o) => ({
        label: fmtDate(o.date), sub: o.label, value: o.pax, cls: STATUS_CLASS[o.status] || "",
      }));

      let html = "";
      html += card("Flights by status", hbars(statusEntries));
      html += card("Passengers by route", hbars(routeEntries, { suffix: "" }));
      html += card("Program timeline", columns(timeEntries), "Passengers per leg, by date");
      html += card("Delay events by IATA category",
        delayEntries.length ? hbars(delayEntries) : '<div class="empty">No delays recorded yet.</div>',
        "From post-flight reports linked to standard IATA delay codes");
      $("charts").innerHTML = html;
    }

    function renderTable() {
      const r = DATA.report;
      const codeCat = Object.fromEntries(DATA.delayCodes.map((d) => [d.code, true]));
      const pfByFlight = {};
      for (const p of DATA.postFlight) pfByFlight[p.flight] = p;
      const rows = DATA.flights
        .filter((f) => filter === "ALL" || f.status === filter)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const body = rows.map((f) => {
        const pf = pfByFlight[f.flightId];
        const delayed = pf && pf.delayCodes.length > 0;
        const flag = ["Completed", "Departed"].includes(f.status)
          ? (delayed ? '<span class="pill pill-amber">Delay</span>' : '<span class="pill pill-green">On time</span>')
          : '<span class="pill pill-gray">—</span>';
        const sc = STATUS_CLASS[f.status] || "s-planning";
        return "<tr>" +
          '<td class="mono"><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.flightId) + "</a></td>" +
          "<td>" + esc(f.route) + "</td>" +
          "<td>" + esc(fmtDate(f.date)) + "</td>" +
          '<td><span class="tag ' + sc + '">' + esc(f.status) + "</span></td>" +
          "<td>" + esc(f.aircraft) + "</td>" +
          '<td class="rt">' + esc(f.pax) + "</td>" +
          '<td class="rt">' + esc(f.pieces) + "</td>" +
          '<td class="rt">' + esc(f.payload ? f.payload.toLocaleString() : "—") + "</td>" +
          "<td>" + flag + "</td>" +
        "</tr>";
      }).join("");
      $("ftable").innerHTML =
        "<thead><tr><th>Flight</th><th>Route</th><th>Date</th><th>Status</th><th>Aircraft</th>" +
        '<th class="rt">Pax</th><th class="rt">Bags</th><th class="rt">Payload</th><th>Departure</th></tr></thead>' +
        "<tbody>" + (body || '<tr><td colspan="9" class="empty">No flights match.</td></tr>') + "</tbody>";
    }

    function wireFilters() {
      const present = STATUS_ORDER.filter((s) => DATA.report.byStatus[s]);
      const bar = $("filterbar");
      bar.innerHTML = '<span class="label">Status:</span>' +
        '<button class="chip on" data-s="ALL">All</button>' +
        present.map((s) => '<button class="chip" data-s="' + esc(s) + '">' + esc(s) + "</button>").join("");
      bar.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
        bar.querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
        c.classList.add("on"); filter = c.dataset.s; renderTable();
      }));
    }

    function renderAll() {
      const r = DATA.report;
      const cust = DATA.customers[0];
      $("customer").textContent = cust ? cust.name : "";
      $("progmeta").textContent = cust
        ? "Program contract " + cust.contract + " · Sales " + cust.rep + " · Ops PM " + cust.pm
        : "";
      renderKpis(r); renderCharts(r); wireFilters(); renderTable();
    }

    let loading = false;
    async function load() {
      if (loading) return; loading = true;
      const rf = $("refresh"); if (rf) rf.disabled = true;
      $("refreshed").textContent = "Refreshing…";
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        if (res.status === 401) { window.location.href = "/login"; return; }
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load");
        DATA = d;
        $("loading").classList.add("hidden"); $("error").classList.add("hidden"); $("content").classList.remove("hidden");
        $("refreshed").textContent = "Updated " + new Date(d.updated).toLocaleString();
        renderAll();
      } catch (e) {
        $("loading").classList.add("hidden");
        const eb = $("error"); eb.classList.remove("hidden");
        eb.textContent = "Could not load data:\n" + ((e && e.message) || e);
        $("refreshed").textContent = "Refresh failed";
      } finally { loading = false; if (rf) rf.disabled = false; }
    }

    const rf = $("refresh"); if (rf) rf.addEventListener("click", () => load());
    const lo = $("logout"); if (lo) lo.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" }); window.location.href = "/login";
    });
    load();
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div className="brandrow">
          <span className="brand-mark" aria-hidden="true">✈</span>
          <div>
            <h1>MOMENTUM <span className="thin">· Passenger Operations Reporting</span></h1>
            <div className="sub"><span id="customer">Loading…</span> <span id="progmeta" className="progmeta"></span></div>
          </div>
        </div>
        <div className="topright">
          <span className="refreshed" id="refreshed">Loading…</span>
          <button className="btn" id="refresh">↻ Refresh</button>
          <button className="btn" id="logout">Log out</button>
        </div>
      </header>

      <div id="content" className="hidden">
        <div className="kpis" id="kpis"></div>
        <div className="charts" id="charts"></div>
        <section className="panel">
          <h2>Flights</h2>
          <div className="bar" id="filterbar"></div>
          <div className="tablewrap"><table className="ftable" id="ftable"></table></div>
        </section>
      </div>

      <div id="loading" className="loading">Loading operations data…</div>
      <div id="error" className="err-box hidden" role="alert"></div>

      <footer className="foot">Read-only reporting · live from Baserow · demo environment</footer>
    </div>
  );
}
