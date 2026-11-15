// Temporary: small previews of free Unsplash photos, so they can be reviewed before use on the site.
import fs from "node:fs";
fs.mkdirSync("public", { recursive: true });
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const queries = fs.readFileSync("queries.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const log = [];
async function thumb(pid) {
  try {
    const r = await fetch(`https://images.unsplash.com/${pid}?auto=format&fit=crop&w=240&h=180&q=50&fm=jpg`);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer()).toString("base64");
  } catch { return null; }
}
let n = 0;
for (const q of queries) {
  n++;
  const rows = [];
  try {
    const r = await fetch(`https://unsplash.com/${q}`, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9" } });
    const html = r.ok ? await r.text() : "";
    const ids = [...new Set([...html.matchAll(/images\.unsplash\.com\/(photo-\d+-[0-9a-f]+)/g)].map((m) => m[1]))].slice(0, 36);
    log.push(`${n} ${q}: ${r.status} ${ids.length}`);
    for (const pid of ids) rows.push({ pid, b64: await thumb(pid) });
  } catch (e) { log.push(`${n} ${q}: ${e}`); }
  fs.writeFileSync(`public/q${String(n).padStart(2, "0")}.txt`, JSON.stringify({ q, rows }));
  await new Promise((r) => setTimeout(r, 1200));
}
fs.writeFileSync("public/index.txt", log.join("\n"));
