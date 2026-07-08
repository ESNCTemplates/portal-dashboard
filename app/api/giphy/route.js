import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Server-side Giphy search proxy. GIPHY_API_KEY never reaches the browser.

const GIPHY_KEY = process.env.GIPHY_API_KEY || "";

export async function GET(req) {
  if (!GIPHY_KEY) {
    return NextResponse.json({ error: "GIPHY_API_KEY is not set." }, { status: 500 });
  }
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ error: "Missing search query ?q=" }, { status: 400 });
  }
  const url =
    "https://api.giphy.com/v1/gifs/search?api_key=" + encodeURIComponent(GIPHY_KEY) +
    "&q=" + encodeURIComponent(q) +
    "&limit=16&rating=pg-13&lang=en";
  try {
    const r = await fetch(url, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: d?.meta?.msg || `Giphy HTTP ${r.status}` }, { status: 502 });
    }
    const results = (d.data || []).map((g) => ({
      giphyId: g.id,
      title: g.title || "",
      gifUrl: g.images?.original?.url || g.images?.downsized_large?.url || "",
      previewUrl: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url || g.images?.fixed_height?.url || "",
    })).filter((x) => x.gifUrl && x.previewUrl);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String((e && e.message) || e) }, { status: 502 });
  }
}
