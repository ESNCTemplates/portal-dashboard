import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Write-scoped actions on SM_Meme_Library (table 5209). Uses a SEPARATE token
// from the read route (BASEROW_WRITE_TOKEN), scoped read+update only on this
// one table. No delete permission is required or expected.

const HOST = (process.env.BASEROW_HOST || "").replace(/\/+$/, "");
const WTOKEN = process.env.BASEROW_WRITE_TOKEN || "";
const TABLE_ID = 5209;
const STATUS_ALLOWLIST = ["active", "needed", "candidate"];

function J(body, status = 200) {
  return NextResponse.json(body, { status });
}

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

async function uploadViaUrl(url) {
  const r = await tfetch(`${HOST}/api/user-files/upload-via-url/`, {
    method: "POST",
    headers: { Authorization: `Token ${WTOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.detail || d?.error || `upload-via-url HTTP ${r.status}`);
  return d;
}

async function patchRow(rowId, fields) {
  const r = await tfetch(`${HOST}/api/database/rows/table/${TABLE_ID}/${rowId}/?user_field_names=true`, {
    method: "PATCH",
    headers: { Authorization: `Token ${WTOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.detail || d?.error || `row PATCH HTTP ${r.status}`);
  return d;
}

export async function POST(req) {
  if (!HOST || !WTOKEN) {
    return J({ error: "BASEROW_HOST and BASEROW_WRITE_TOKEN must be set." }, 500);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return J({ error: "Invalid JSON body" }, 400);
  }

  const { action } = body || {};

  try {
    switch (action) {
      case "attach_gif": {
        const { rowId, gifUrl, giphyId, altText } = body;
        if (!rowId || !gifUrl) return J({ error: "rowId and gifUrl are required" }, 400);

        const uploaded = await uploadViaUrl(gifUrl);
        const fields = {
          "GIF File": [{ name: uploaded.name }],
          Status: "active",
        };
        if (giphyId) fields["Giphy ID"] = String(giphyId);
        if (altText) fields["Alt Text"] = String(altText).slice(0, 500);

        const updated = await patchRow(rowId, fields);
        return J({ ok: true, row: updated });
      }

      case "set_status": {
        const { rowId, status } = body;
        if (!rowId || !STATUS_ALLOWLIST.includes(status)) {
          return J({ error: `status must be one of ${STATUS_ALLOWLIST.join(", ")}` }, 400);
        }
        const updated = await patchRow(rowId, { Status: status });
        return J({ ok: true, row: updated });
      }

      default:
        return J({ error: "unknown action" }, 400);
    }
  } catch (e) {
    return J({ error: String((e && e.message) || e) }, 502);
  }
}
