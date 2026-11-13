#!/bin/bash
# Temporary: download small previews of free Unsplash photos so they can be reviewed before use on the site.
mkdir -p out
n=0
while IFS= read -r q; do
  [ -z "$q" ] && continue
  n=$((n+1)); d=$(printf "out/q%02d" $n); mkdir -p "$d"
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$q")
  curl -sS -m 30 -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" -H "Accept: application/json" \
    "https://unsplash.com/napi/search/photos?query=$enc&per_page=30&page=1" -o "$d/results.json" || true
  python3 - "$d" "$q" <<'PY'
import json,sys,subprocess,os
d,q=sys.argv[1],sys.argv[2]
try: data=json.load(open(d+'/results.json'))
except Exception as e:
    open(d+'/error.txt','w').write(str(e)); sys.exit(0)
rows=[]
for r in data.get('results',[]):
    if r.get('premium') or r.get('plus'): continue
    raw=r['urls']['raw'].split('?')[0]
    pid=raw.rsplit('/',1)[-1]
    if not pid.startswith('photo-'): continue
    f=f"{d}/{r['id']}.jpg"
    subprocess.run(['curl','-sS','-m','30','-o',f,raw+'?auto=format&fit=crop&w=360&h=270&q=60'])
    rows.append(dict(id=r['id'],pid=pid,slug=r.get('slug'),alt=r.get('alt_description'),user=r['user']['name'],loc=(r['user'].get('location') or ''),w=r['width'],h=r['height']))
json.dump(dict(query=q,rows=rows),open(d+'/index.json','w'),indent=1)
os.remove(d+'/results.json')
PY
  sleep 2
done < queries.txt
