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
        try:
            page = get(f"https://www.pexels.com/search/{urllib.parse.quote(q)}/").decode("utf8", "ignore")
        except Exception as e:
            groups.append((q, [], str(e))); continue
        found = {}
        for m in re.finditer(r'images\.pexels\.com/photos/(\d+)/[^"\s]*', page):
            found.setdefault("px:" + m.group(1), "")
        for m in re.finditer(r'href="/(?:[a-z-]+/)?photo/([a-z0-9-]+)-(\d+)/"', page):
            found["px:" + m.group(2)] = m.group(1).replace("-", " ")
        groups.append((q, list(found.items())[:20], "" if found else "no results parsed, len %d" % len(page)))
def resolve(token):
    """us:<shortid> -> free Unsplash image URL (or reason); px:<id> -> Pexels image URL; photo-... -> Unsplash CDN."""
    if token.startswith("us:"):
        sid = token[3:]
        try:
            req = urllib.request.Request(f"https://unsplash.com/photos/{sid}/download?force=true", headers=UA)
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, *a, **k): return None
            op = urllib.request.build_opener(NoRedirect)
            try:
                r = op.open(req, timeout=30); return None, f"no redirect {r.status}"
            except urllib.error.HTTPError as e:
                loc = e.headers.get("Location", "")
                m = re.search(r"images\.unsplash\.com/(photo-[a-z0-9-]+)", loc)
                if m: return f"https://images.unsplash.com/{m.group(1)}?auto=format&fit=crop&fm=jpg&q=70&w=330&h=240", m.group(1)
                return None, f"{e.code} {loc[:80]}"
        except Exception as e:
            return None, str(e)
    if token.startswith("px:"):
        i = token[3:]
        return f"https://images.pexels.com/photos/{i}/pexels-photo-{i}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=330&h=240", f"pexels-{i}"
    return f"https://images.unsplash.com/{token}?auto=format&fit=crop&fm=jpg&q=70&w=330&h=240", token

if os.path.exists("scout/ids.txt"):
    lines = [l.strip() for l in open("scout/ids.txt") if l.strip() and not l.startswith("#")]
    for start in range(0, len(lines), 20):
        groups.append((f"ids {start}", [(l.split()[0], " ".join(l.split()[1:])) for l in lines[start:start + 20]], ""))

index = {}
for gi, (name, items, err) in enumerate(groups):
    tiles = []
    for ii, (pid, alt) in enumerate(items):
        label = f"{gi}-{ii}"
        index[label] = {"id": pid, "alt": alt, "query": name}
        path = f"/tmp/{label}.jpg"
        url, info = resolve(pid)
        index[label]["resolved"] = info
        if not url:
            index[label]["error"] = info; continue
        try:
            open(path, "wb").write(get(url))
            tiles.append((path, label))
        except Exception as e:
            index[label]["error"] = str(e)
    if not tiles: continue
    args = ["montage"]
    for p, label in tiles: args += ["-label", label, p]
    args += ["-tile", "5x", "-geometry", "330x240+4+4", "-pointsize", "22", "-background", "#ffffff", f"{OUT}/sheet-{gi}.jpg"]
    subprocess.run(args, check=True)
json.dump({"groups": [{"n": i, "query": g[0], "error": g[2], "count": len(g[1])} for i, g in enumerate(groups)], "index": index}, open(f"{OUT}/index.json", "w"), indent=1)
