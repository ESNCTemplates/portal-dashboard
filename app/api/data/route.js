import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---- token-holding proxy: the ONLY place BASEROW_TOKEN lives ----
const HOST = (process.env.BASEROW_HOST || "").replace(/\/+$/, "");
const TOKEN = process.env.BASEROW_TOKEN || "";
const DB = 968;

const T = {
  customers: 5668,
  delayCodes: 5669,
  flights: 5670,
  catering: 5671,
  siteRep: 5672,
  postFlight: 5673,
};

// ~20s timeout + one retry — a self-hosted Baserow under load can be slow.
async function tfetch(url, opts = {}, tries = 2) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      return r;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
    }
  }
  throw lastErr;
}

async function fetchAll(tableId) {
  let out = [], page = 1;
  for (let i = 0; i < 15; i++) {
    const url = `${HOST}/api/database/rows/table/${tableId}/` +
                `?user_field_names=true&size=200&page=${page}`;
    const r = await tfetch(url, { headers: { Authorization: `Token ${TOKEN}` }, cache: "no-store" });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Baserow table ${tableId} -> HTTP ${r.status} ${t.slice(0, 160)}`);
    }
    const d = await r.json();
    out = out.concat(d.results || []);
    if (!d.next) break;
    page++;
  }
  return out;
}

// single_select -> value string; multi_select -> array of values; link_row -> array of values
const sel = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x.value || "" : x || "");
const multi = (x) => (Array.isArray(x) ? x.map((o) => (o && o.value != null ? o.value : o)) : []);
const links = (x) => (Array.isArray(x) ? x.map((o) => (o && o.value != null ? o.value : o)) : []);
const num = (x) => (x == null || x === "" ? 0 : Number(x) || 0);
const rowUrl = (tid, id) => `${HOST}/database/${DB}/table/${tid}/${id}`;

function normFlight(r) {
  return {
    id: r.id, flightId: sel(r["Flight ID"]) || String(r.id),
    customer: links(r.Customer)[0] || "",
    leg: num(r["Leg No"]), status: sel(r.Status) || "—", type: sel(r["Flight Type"]) || "",
    date: r["Flight Date"] || "", route: sel(r.Route) || "",
    std: sel(r["STD (Local)"]) || "", sta: sel(r["STA (Local)"]) || "",
    carrier: sel(r["Carrier / Airline"]) || "", aircraft: sel(r["Aircraft Type"]) || "",
    reg: sel(r.Registration) || "", flightNo: sel(r["Flight Number"]) || "",
    pax: num(r["Total Pax"]), pieces: num(r["Total Checked Pieces"]),
    bagWt: num(r["Total Baggage Wt"]), cargo: num(r["Cargo Wt"]), payload: num(r["Total Payload"]),
    weightUnit: sel(r["Weight Unit"]) || "", amenities: multi(r["On-board Amenities"]),
    catering: !!r["Catering Required"], url: rowUrl(T.flights, r.id),
  };
}
const normCatering = (r) => ({
  id: r.id, flight: links(r.Flight)[0] || "", provider: sel(r["Catering Provider"]) || "",
  hot: num(r["Hot Meals Qty"]), cold: num(r["Cold Meals Qty"]), snacks: num(r["Snacks Qty"]),
  special: multi(r["Special Meal Types"]), url: rowUrl(T.catering, r.id),
});
const normSiteRep = (r) => ({
  id: r.id, flight: links(r.Flight)[0] || "", opsRep: sel(r["Ops Rep"]) || "",
  preflight: sel(r["Pre-Flight Status"]) || "", paxOnBoard: num(r["Total Pax On Board"]),
  bagWait: num(r["Baggage Wait (min)"]), damaged: !!r["Damaged Bags"], missing: !!r["Missing Bags"],
  takeoff: sel(r.Takeoff) || "", std: "", url: rowUrl(T.siteRep, r.id),
});
const normPostFlight = (r) => ({
  id: r.id, flight: links(r.Flight)[0] || "", date: r["Report Date"] || "",
  delayCodes: links(r["Delay Codes"]), delayDesc: sel(r["Delay Description"]) || "",
  lessons: sel(r["Lessons Learned"]) || "", by: sel(r["Completed By"]) || "",
  url: rowUrl(T.postFlight, r.id),
});
const normDelay = (r) => ({
  code: sel(r.Code) || "", iata: sel(r["IATA Code"]) || "", numeric: num(r.Numeric),
  category: sel(r.Category) || "", description: sel(r.Description) || "",
});
const normCustomer = (r) => ({
  id: r.id, name: sel(r.Customer) || "", rep: sel(r["MDS Sales Rep"]) || "",
  pm: sel(r["MDS Ops Program Mgr"]) || "", contract: sel(r["MDS Contract No"]) || "",
  url: rowUrl(T.customers, r.id),
});

export async function GET() {
  if (!HOST || !TOKEN) {
    return NextResponse.json(
      { error: "BASEROW_HOST and BASEROW_TOKEN must be set as environment variables." },
      { status: 500 }
    );
  }
  try {
    const [cu, dc, fl, ca, sr, pf] = await Promise.all([
      fetchAll(T.customers), fetchAll(T.delayCodes), fetchAll(T.flights),
      fetchAll(T.catering), fetchAll(T.siteRep), fetchAll(T.postFlight),
    ]);
    const flights = fl.map(normFlight);
    const catering = ca.map(normCatering);
    const siteRep = sr.map(normSiteRep);
    const postFlight = pf.map(normPostFlight);
    const delayCodes = dc.map(normDelay);
    const customers = cu.map(normCustomer);

    // ---- server-side report aggregates ----
    const codeCat = Object.fromEntries(delayCodes.map((d) => [d.code, d.category]));
    const flownStatuses = new Set(["Completed", "Departed"]);
    const byStatus = {};
    for (const f of flights) byStatus[f.status] = (byStatus[f.status] || 0) + 1;

    const flown = flights.filter((f) => flownStatuses.has(f.status));
    const paxCarried = siteRep.reduce((a, s) => a + s.paxOnBoard, 0);
    const paxScheduled = flights.reduce((a, f) => a + f.pax, 0);

    const delayEvents = postFlight.filter((p) => p.delayCodes.length > 0).length;
    const reported = postFlight.length;
    const onTimeReported = reported - delayEvents;

    const delayByCat = {};
    for (const p of postFlight)
      for (const c of p.delayCodes) {
        const cat = codeCat[c] || "Other";
        delayByCat[cat] = (delayByCat[cat] || 0) + 1;
      }

    const paxByRoute = {};
    for (const f of flights) paxByRoute[f.route] = (paxByRoute[f.route] || 0) + f.pax;

    const overTime = flights
      .filter((f) => f.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((f) => ({ date: f.date, label: f.route, pax: f.pax, status: f.status }));

    const bagWaits = siteRep.filter((s) => s.bagWait > 0).map((s) => s.bagWait);
    const avgBagWait = bagWaits.length ? Math.round(bagWaits.reduce((a, b) => a + b, 0) / bagWaits.length) : 0;
    const specialMeals = catering.reduce((a, c) => a + c.special.length, 0);

    const report = {
      totalFlights: flights.length,
      flownCount: flown.length,
      activeCount: flights.filter((f) => ["Confirmed", "Day-of Ops", "Departed"].includes(f.status)).length,
      completedCount: byStatus["Completed"] || 0,
      paxCarried, paxScheduled,
      delayEvents, reported, onTimeReported,
      onTimePct: reported ? Math.round((onTimeReported / reported) * 100) : null,
      avgBagWait, specialMeals,
      customers: customers.length,
      byStatus, delayByCat, paxByRoute, overTime,
    };

    return NextResponse.json(
      { flights, catering, siteRep, postFlight, delayCodes, customers, report,
        updated: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String((e && e.message) || e) }, { status: 502 });
  }
}
