// TEMPORARY photo scouting route — lives only on the photo-scout preview branch.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36", Accept: "application/json" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const ids = url.searchParams.get("ids");
  if (q) {
    const out: unknown[] = [];
    await Promise.all(
      q.split("|").map(async (query) => {
        const slug = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const r = await fetch(`https://unsplash.com/s/photos/${slug}?license=free`, { headers: { ...UA, Accept: "text/html" } });
        if (!r.ok) return void out.push({ query, error: r.status });
        const html = await r.text();
        const seen = new Map<string, string>();
        for (const m of html.matchAll(/<img[^>]*?alt="([^"]*)"[^>]*?src="https:\/\/images\.unsplash\.com\/(photo-[a-z0-9-]+)/g)) if (!seen.has(m[2])) seen.set(m[2], m[1]);
        for (const m of html.matchAll(/<img[^>]*?src="https:\/\/images\.unsplash\.com\/(photo-[a-z0-9-]+)[^"]*"[^>]*?alt="([^"]*)"/g)) if (!seen.has(m[1])) seen.set(m[1], m[2]);
        out.push({ query, plusOnPage: (html.match(/plus\.unsplash\.com/g) ?? []).length, results: [...seen].map(([id, alt]) => ({ id, alt })) });
      }),
    );
    return Response.json(out);
  }
  if (ids) {
    const w = url.searchParams.get("w") ?? "360";
    const out: Record<string, string> = {};
    await Promise.all(
      ids.split(",").map(async (id) => {
        const r = await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&fm=jpg&q=60&w=${w}`);
        out[id] = r.ok ? Buffer.from(await r.arrayBuffer()).toString("base64") : `ERR ${r.status}`;
      }),
    );
    return Response.json(out);
  }
  return Response.json({ usage: "?q=a|b or ?ids=photo-1,photo-2" });
}
