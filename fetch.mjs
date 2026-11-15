// Temporary: small previews of free Unsplash photos, so they can be reviewed before use on the site.
import fs from "node:fs";
fs.mkdirSync("public", { recursive: true });
for (const line of fs.readFileSync("groups.txt", "utf8").split("\n").filter(Boolean)) {
  const [name, list] = line.split(":");
  const rows = [];
  for (const pid of list.split(",").map((s) => s.trim()).filter(Boolean)) {
    let b64 = null;
    try {
      const r = await fetch(`https://images.unsplash.com/${pid}?auto=format&fit=crop&w=240&h=180&q=50&fm=jpg`);
      if (r.ok) b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
    } catch {}
    rows.push({ pid, b64 });
  }
  fs.writeFileSync(`public/${name.trim()}.txt`, JSON.stringify({ q: name, rows }));
}
