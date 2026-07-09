import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Write actions on SM_Meme_Library (table 5209). Uses a SEPARATE token from the
// read route (BASEROW_WRITE_TOKEN), scoped create+read+update on this one table.
// No delete permission is required or expected.

const HOST = (process.env.BASEROW_HOST || "").replace(/\/+$/, "");
const WTOKEN = process.env.BASEROW_WRITE_TOKEN || "";
const TABLE_ID = 5209;
const STATUS_ALLOWLIST = ["active", "needed", "candidate"];
const TONE_ALLOWLIST = ["comedic", "dramatic", "wholesome", "sarcastic", "playful"];

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

async function createRow(fields) {
  const r = await tfetch(`${HOST}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`, {
    method: "POST",
    headers: { Authorization: `Token ${WTOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.detail || d?.error || `row POST HTTP ${r.status}`);
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
      // Add a NEW variant GIF into a bucket (creates a new row).
      case "add_variant": {
        const { bucket, gifUrl, giphyId, altText, tone, whenToUse, characterFit } = body;
        if (!bucket || !gifUrl) return J({ error: "bucket and gifUrl are required" }, 400);
        if (tone && !TONE_ALLOWLIST.includes(tone)) {
          return J({ error: `tone must be one of ${TONE_ALLOWLIST.join(", ")}` }, 400);
        }
        const uploaded = await uploadViaUrl(gifUrl);
        const fields = {
          "Reaction Name": `${bucket} — variant`,
          Bucket: bucket,
          "GIF File": [{ name: uploaded.name }],
          "Emotion Tag": bucket,
          Status: "active",
        };
        if (giphyId) fields["Giphy ID"] = String(giphyId);
        if (altText) fields["Alt Text"] = String(altText).slice(0, 500);
        if (tone) fields["Tone"] = tone;
        if (whenToUse) fields["When To Use"] = String(whenToUse).slice(0, 2000);
        if (characterFit) fields["Character Fit / Keywords"] = String(characterFit).slice(0, 2000);
        const created = await createRow(fields);
        return J({ ok: true, row: created });
      }

      // Attach a GIF onto an EXISTING row (fill a "needed" slot or replace).
      case "attach_gif": {
        const { rowId, gifUrl, giphyId, altText } = body;
        if (!rowId || !gifUrl) return J({ error: "rowId and gifUrl are required" }, 400);
        const uploaded = await uploadViaUrl(gifUrl);
        const fields = { "GIF File": [{ name: uploaded.name }], Status: "active" };
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

      // Enqueue a "made" generation job (portal is the intake; the Meme Maker
      // pipeline, which has admin rights, picks it up and generates the image).
      case "queue_generation": {
        const { bucket, proposedBucket, character, tone, whenToUse, reactionName,
                topCaption, bottomCaption, imagePrompt, altText } = body;
        const bkt = (bucket || "").trim();
        const newBkt = (proposedBucket || "").trim();
        if (!bkt && !newBkt) return J({ error: "bucket or proposedBucket is required" }, 400);
        if (!imagePrompt && !topCaption && !bottomCaption) {
          return J({ error: "provide an imagePrompt or a caption" }, 400);
        }
        if (tone && !TONE_ALLOWLIST.includes(tone)) {
          return J({ error: `tone must be one of ${TONE_ALLOWLIST.join(", ")}` }, 400);
        }
        const recipe =
          "ENGINE: Imagen (character consistency)\n" +
          (topCaption ? "CAPTION TOP: " + topCaption + "\n" : "") +
          (bottomCaption ? "CAPTION BOTTOM: " + bottomCaption + "\n" : "") +
          "\nIMAGE PROMPT:\n" + (imagePrompt || "(none provided)");
        const label = bkt || newBkt;
        const fields = {
          "Reaction Name": (reactionName || `${label} — ${character || "new"}`).slice(0, 200),
          "Emotion Tag": label,
          Status: "candidate",
          Source: "made",
          Generator: "ai-image",
          "Job Status": "queued",
          Recipe: recipe,
        };
        if (bkt) fields["Bucket"] = bkt;          // existing bucket -> set the single-select
        else fields["Proposed Bucket"] = newBkt;  // new bucket -> pipeline materializes it
        if (character) fields["Character"] = String(character).slice(0, 120);
        if (tone) fields["Tone"] = tone;
        if (whenToUse) fields["When To Use"] = String(whenToUse).slice(0, 2000);
        if (altText) fields["Alt Text"] = String(altText).slice(0, 500);
        const created = await createRow(fields);
        return J({ ok: true, row: created });
      }

      default:
        return J({ error: "unknown action" }, 400);
    }
  } catch (e) {
    return J({ error: String((e && e.message) || e) }, 502);
  }
}
