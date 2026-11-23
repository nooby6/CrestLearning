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
    for (const query of q.split("|")) {
      const r = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30&plus=none`, { headers: UA });
      if (!r.ok) {
        out.push({ query, error: r.status });
        continue;
      }
      const j = await r.json();
      out.push({
        query,
        results: (j.results ?? [])
          .filter((p: any) => !p.premium && !p.plus)
          .map((p: any) => ({ id: p.urls?.raw?.match(/unsplash\.com\/([^?]+)/)?.[1], slug: p.slug, alt: p.alt_description, desc: p.description, w: p.width, h: p.height, by: p.user?.name })),
      });
    }
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
