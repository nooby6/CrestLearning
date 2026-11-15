// Temporary: small previews of free Unsplash photos, so they can be reviewed before use on the site.
import fs from "node:fs";
fs.mkdirSync("public", { recursive: true });
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const queries = fs.readFileSync("queries.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const log = [];
async function thumb(raw) {
  try {
    const r = await fetch(raw + "?auto=format&fit=crop&w=240&h=180&q=50&fm=jpg");
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer()).toString("base64");
  } catch { return null; }
}
let n = 0;
for (const q of queries) {
  n++;
  const rows = [];
  try {
    const r = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=30&page=1`, { headers: { "user-agent": UA, accept: "application/json" } });
    log.push(`${n} ${q}: ${r.status}`);
    if (r.ok) {
      const data = await r.json();
      for (const p of data.results ?? []) {
        if (p.premium || p.plus) continue;
        const raw = p.urls.raw.split("?")[0];
        const pid = raw.split("/").pop();
        if (!pid.startsWith("photo-")) continue;
        rows.push({ id: p.id, pid, alt: p.alt_description, user: p.user?.name, loc: p.user?.location ?? "", w: p.width, h: p.height, b64: await thumb(raw) });
      }
    }
  } catch (e) { log.push(`${n} ${q}: ${e}`); }
  fs.writeFileSync(`public/q${String(n).padStart(2, "0")}.txt`, JSON.stringify({ q, rows }));
  await new Promise((r) => setTimeout(r, 1500));
}
// Known candidates, in case search is blocked.
const known = fs.readFileSync("known.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const rows = [];
for (const pid of known) rows.push({ pid, b64: await thumb("https://images.unsplash.com/" + pid) });
fs.writeFileSync("public/known.txt", JSON.stringify({ q: "known", rows }));
fs.writeFileSync("public/index.txt", log.join("\n"));
