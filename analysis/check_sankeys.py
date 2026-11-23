"""
Confere os sankeys de src/data/sc-china.json como o site os desenha: para a vista
geral e para o clique em cada nó, aponta ligações que não existem na vista geral
(o site não as anima), ligações para nós que não são desenhados e nós do meio
cuja entrada e saída não batem (uma faixa que chega e não sai, ou o contrário).

    python analysis/check_sankeys.py   (depois de analysis/sc_china.py)
"""
import json
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path
D = json.loads((Path(__file__).resolve().parents[1] / "src/data/sc-china.json").read_text(encoding="utf-8"))
problems = 0
for key in ("exportSankey", "vaSankey", "useSankey"):
    s = D[key]
    over = {(l["source"], l["target"]): l["value"] for l in s["links"]}
    names = {n["name"] for n in s["nodes"]}
    sources = {a for a, _ in over}
    targets = {b for _, b in over}
    middle = sources & targets
    views = {"(overview)": s["links"]}
    for n in names:  # what a click on each node shows (same rule as the site)
        views[n] = s.get("views", {}).get(n) or [l for l in s["links"] if n in (l["source"], l["target"])]
    for vname, lk in views.items():
        missing = [(l["source"], l["target"]) for l in lk if (l["source"], l["target"]) not in over]
        bad_end = [l for l in lk if l["source"] not in names or l["target"] not in names]
        # what is drawn: only overview keys; the site hides links that are practically zero
        vals = {(l["source"], l["target"]): l["value"] for l in lk if (l["source"], l["target"]) in over}
        out, inn = Counter(), Counter()
        for (a, b), v in vals.items():
            out[a] += v
            inn[b] += v
        total = sum(v for n, v in out.items() if n not in inn)
        drawn = {k: v for k, v in vals.items() if v > total * 1e-6}
        dout, dinn = Counter(), Counter()
        for (a, b), v in drawn.items():
            dout[a] += v
            dinn[b] += v
        broken = []
        for n in middle:
            i, o = dinn[n], dout[n]
            if max(i, o) > total * 0.004 and abs(i - o) > max(0.05, 0.005 * max(i, o)):
                broken.append(f"{n}: in {i:.1f}, out {o:.1f}")
        if missing or bad_end or broken:
            problems += 1
            print(f"{key} / {vname}: {len(missing)} links not in overview {missing[:3]}; "
                  f"{len(bad_end)} links to undrawn nodes; unbalanced: {broken}")
print("problemas:", problems)
sys.exit(1 if problems else 0)
