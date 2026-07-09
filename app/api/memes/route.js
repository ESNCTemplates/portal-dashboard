import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Read-only view of SM_Meme_Library (Baserow DB 735, table 5209).
// BASEROW_TOKEN here must be the READ-scoped token (see .env.example).

const HOST = (process.env.BASEROW_HOST || "").replace(/\/+$/, "");
const TOKEN = process.env.BASEROW_TOKEN || "";
const TABLE_ID = 5209;

async function tfetch(url, opts, tries = 2) {
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000);
    try {
      const r = await fetch(url, { ...opts, signal: ac.signal });
      clearTimeout(t);
      return r;
    } catch (e) {
      clearTimeout(t);
      if (i === tries - 1) throw e;
    }
  }
}

async function fetchAll() {
  let out = [], page = 1;
  const size = 200;
  for (let i = 0; i < 15; i++) {
    const url = `${HOST}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&size=${size}&page=${page}`;
    const r = await tfetch(url, { headers: { Authorization: `Token ${TOKEN}` }, cache: "no-store" });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Baserow table ${TABLE_ID} -> HTTP ${r.status} ${t.slice(0, 160)}`);
    }
    const d = await r.json();
    out = out.concat(d.results || []);
    if (!d.next) break;
    page++;
  }
  return out;
}

const sel = (x) => (x && typeof x === "object" ? x.value || "" : x || "");

function normalize(row) {
  const files = Array.isArray(row["GIF File"]) ? row["GIF File"] : [];
  const first = files[0] || null;
  return {
    id: row.id,
    title: row["Reaction Name"] || String(row.id),
    bucket: sel(row.Bucket) || "",
    tone: sel(row.Tone) || "",
    whenToUse: row["When To Use"] || "",
    characterFit: row["Character Fit / Keywords"] || "",
    status: sel(row.Status) || "candidate",
    emotionTag: row["Emotion Tag"] || "",
    allowedSenders: row["Allowed Senders"] || "",
    giphyId: row["Giphy ID"] || "",
    altText: row["Alt Text"] || "",
    holdMs: row["Hold Ms"] || null,
    placementNote: row["Placement Note"] || "",
    notes: row.Notes || "",
    gifUrl: first ? first.url : null,
    gifThumb: first && first.thumbnails ? (first.thumbnails.card_cover?.url || first.thumbnails.small?.url) : null,
  };
}

export async function GET() {
  if (!HOST || !TOKEN) {
    return NextResponse.json(
      { error: "BASEROW_HOST and BASEROW_TOKEN must be set as environment variables." },
      { status: 500 }
    );
  }
  try {
    const rows = await fetchAll();
    const items = rows
      .map(normalize)
      .filter((x) => x.title && x.title !== "Reaction Name");
    return NextResponse.json(
      { items, updated: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String((e && e.message) || e) }, { status: 502 });
  }
}
