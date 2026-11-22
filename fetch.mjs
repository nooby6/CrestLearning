// Temporary: fetch photos at full quality so they can be reviewed and self-hosted on the site.
import fs from "node:fs";
fs.mkdirSync("public", { recursive: true });
const ids = fs.readFileSync("ids.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const meta = [];
for (const pid of ids) {
  for (const [tag, q] of [["s", "w=520&h=390&fit=crop&q=60"], ["f", "w=2000&q=85&fit=max"]]) {
    try {
      const r = await fetch(`https://images.unsplash.com/${pid}?auto=format&fm=jpg&${q}`);
      if (!r.ok) { meta.push(`${pid} ${tag} ${r.status}`); continue; }
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(`public/${tag}-${pid}.txt`, b.toString("base64"));
      meta.push(`${pid} ${tag} ${b.length}`);
    } catch (e) { meta.push(`${pid} ${tag} ${e}`); }
  }
}
// Contact sheet data: all small previews in one file.
fs.writeFileSync("public/all-small.txt", JSON.stringify({ q: "all", rows: ids.filter((p) => fs.existsSync(`public/s-${p}.txt`)).map((pid) => ({ pid, b64: fs.readFileSync(`public/s-${pid}.txt`, "utf8") })) }));
fs.writeFileSync("public/index.txt", meta.join("\n"));
