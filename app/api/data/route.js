import { NextResponse } from "next/server";

// ---- EDIT THESE ----
const TABLE_ID = process.env.BASEROW_TABLE_ID || "REPLACE_TABLE_ID";
// Map your Baserow field names -> the flat item shape the page renders.
function normalize(row) {
  return {
    id: row.id,
    title: row.Name || row.Title || "(untitled)",
    group: sel(row.Category) || sel(row.Group) || null,
    status: sel(row.Status) || null,
    url: row["Source URL"] || null,
  };
}
// single-select fields come back as {id,value,color}
function sel(v) { return v && typeof v === "object" ? v.value : v || null; }

export async function GET() {
  const host = process.env.BASEROW_HOST || "https://api.baserow.io";
  const token = process.env.BASEROW_TOKEN;
  if (!token) return NextResponse.json({ error: "BASEROW_TOKEN not set" }, { status: 500 });
  try {
    const items = [];
    let url = `${host}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&size=200`;
    while (url) {
      const r = await fetch(url, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
      if (!r.ok) throw new Error(`Baserow ${r.status}`);
      const d = await r.json();
      for (const row of d.results || []) items.push(normalize(row));
      url = d.next || null;
    }
    return NextResponse.json({ items, updated: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 502 });
  }
}
