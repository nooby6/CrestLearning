"""Temporary: search Unsplash (free licence only) and build labelled contact sheets."""
import html, json, os, re, subprocess, urllib.request, urllib.parse
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
OUT = "scout/out"; os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()

groups = []  # (name, [(id, alt)])
if os.path.exists("scout/queries.txt"):
    for qi, q in enumerate(l.strip() for l in open("scout/queries.txt") if l.strip()):
        slug = re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")
        try:
            page = get(f"https://unsplash.com/s/photos/{slug}?license=free").decode("utf8", "ignore")
        except Exception as e:
            groups.append((q, [], str(e))); continue
        found = {}
        for tag in re.findall(r"<img[^>]+>", page):
            m = re.search(r'src="https://images\.unsplash\.com/(photo-[a-z0-9-]+)', tag)
            if not m or "plus.unsplash" in tag: continue
            alt = re.search(r'alt="([^"]*)"', tag)
            found.setdefault(m.group(1), html.unescape(alt.group(1)) if alt else "")
        groups.append((q, list(found.items())[:15], ""))
if os.path.exists("scout/ids.txt"):
    items = []
    for l in open("scout/ids.txt"):
        l = l.strip()
        if l: items.append((l.split()[0], " ".join(l.split()[1:])))
    groups.append(("picked", items, ""))

index = {}
for gi, (name, items, err) in enumerate(groups):
    tiles = []
    for ii, (pid, alt) in enumerate(items):
        label = f"{gi}-{ii}"
        index[label] = {"id": pid, "alt": alt, "query": name}
        path = f"/tmp/{label}.jpg"
        try:
            open(path, "wb").write(get(f"https://images.unsplash.com/{pid}?auto=format&fit=crop&fm=jpg&q=70&w=330&h=240"))
            tiles.append((path, label))
        except Exception as e:
            index[label]["error"] = str(e)
    if not tiles: continue
    args = ["montage"]
    for p, label in tiles: args += ["-label", label, p]
    args += ["-tile", "5x", "-geometry", "330x240+4+4", "-pointsize", "22", "-background", "#ffffff", f"{OUT}/sheet-{gi}.jpg"]
    subprocess.run(args, check=True)
json.dump({"groups": [{"n": i, "query": g[0], "error": g[2], "count": len(g[1])} for i, g in enumerate(groups)], "index": index}, open(f"{OUT}/index.json", "w"), indent=1)
