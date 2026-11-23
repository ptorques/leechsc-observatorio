"""
Simplifica o GeoJSON das províncias chinesas (exploratory/cn.json, simplemaps.com,
~7,5 MB) para o mapa do site (src/data/china-geo.json, ~150 kB).

As fronteiras são simplificadas como "arcos": cada trecho de divisa entre duas
províncias é simplificado uma única vez e reaproveitado pelas duas, de modo
que não surgem frestas nem sobreposições entre vizinhas. Ilhas pequenas são
descartadas (a maior parte de cada província é sempre mantida).

    python analysis/china_map.py
"""
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXP = ROOT / "exploratory"
SRC = EXP / "cn.json"
OUT = ROOT / "src/data/china-geo.json"

TOLERANCE = 0.025   # graus (~2,5 km): tolerância do Douglas-Peucker
MIN_AREA = 0.02     # graus²: ilhas menores que isso são descartadas
DIGITS = 3          # casas decimais nas coordenadas (~100 m)

# id do simplemaps → nome usado em sc-china.json (footprint.provinces[].name)
NAMES = {
    "CNBJ": "Pequim", "CNTJ": "Tianjin", "CNHE": "Hebei", "CNSX": "Shanxi",
    "CNNM": "Mongólia Interior", "CNLN": "Liaoning", "CNJL": "Jilin",
    "CNHL": "Heilongjiang", "CNSH": "Xangai", "CNJS": "Jiangsu", "CNZJ": "Zhejiang",
    "CNAH": "Anhui", "CNFJ": "Fujian", "CNJX": "Jiangxi", "CNSD": "Shandong",
    "CNHA": "Henan", "CNHB": "Hubei", "CNHN": "Hunan", "CNGD": "Guangdong",
    "CNGX": "Guangxi", "CNHI": "Hainan", "CNCQ": "Chongqing", "CNSC": "Sichuan",
    "CNGZ": "Guizhou", "CNYN": "Yunnan", "CNXZ": "Tibete", "CNSN": "Shaanxi",
    "CNGS": "Gansu", "CNQH": "Qinghai", "CNNX": "Ningxia", "CNXJ": "Xinjiang",
    # fora da matriz do CEADS (aparecem no mapa sem dados)
    "CNTW": "Taiwan", "CNHK": "Hong Kong", "CNMO": "Macau",
}


def key(p):
    return (round(p[0], 6), round(p[1], 6))


def ring_area(r):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1]))) / 2


def douglas_peucker(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        (x1, y1), (x2, y2) = pts[i], pts[j]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy)
        best, idx = 0.0, -1
        for k in range(i + 1, j):
            x, y = pts[k]
            d = abs(dy * (x - x1) - dx * (y - y1)) / norm if norm else math.hypot(x - x1, y - y1)
            if d > best:
                best, idx = d, k
        if best > tol:
            keep[idx] = True
            stack += [(i, idx), (idx, j)]
    return [p for p, k in zip(pts, keep) if k]


def simplify_arc(arc, cache={}):
    # mesma orientação para o mesmo trecho, venha ele de qualquer das duas províncias
    flip = arc[0] > arc[-1] or (arc[0] == arc[-1] and arc[1] > arc[-2])
    canon = tuple(arc[::-1] if flip else arc)
    if canon not in cache:
        cache[canon] = douglas_peucker(list(canon), TOLERANCE)
    out = cache[canon]
    return out[::-1] if flip else out


def main():
    geo = json.loads(SRC.read_text(encoding="utf-8"))

    # anéis como listas de vértices (sem o ponto de fechamento repetido)
    feats = []
    for f in geo["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        rings = [[[key(p) for p in r[:-1]] for r in poly] for poly in polys]
        feats.append((f["properties"]["id"], rings))

    # nós: vértices onde três ou mais trechos de fronteira se encontram
    neighbors = defaultdict(set)
    for _, polys in feats:
        for poly in polys:
            for r in poly:
                for a, b in zip(r, r[1:] + r[:1]):
                    neighbors[a].add(b)
                    neighbors[b].add(a)
    is_node = {p for p, s in neighbors.items() if len(s) > 2}

    def simplify_ring(r):
        cuts = [i for i, p in enumerate(r) if p in is_node]
        if not cuts:  # ilha ou anel isolado: um único arco fechado
            out = simplify_arc(r + [r[0]])[:-1]
        else:
            r = r[cuts[0]:] + r[: cuts[0]]  # começa num nó
            cuts = [c - cuts[0] if c >= cuts[0] else c + len(r) - cuts[0] for c in cuts] + [len(r)]
            cuts = sorted(set(cuts))
            ring = r + [r[0]]
            out = []
            for i, j in zip(cuts, cuts[1:]):
                out += simplify_arc(ring[i : j + 1])[:-1]
        return out if len(out) >= 3 else None

    features = []
    for fid, polys in feats:
        largest = max(range(len(polys)), key=lambda i: ring_area(polys[i][0]))
        out_polys = []
        for i, poly in enumerate(polys):
            if i != largest and ring_area(poly[0]) < MIN_AREA:
                continue
            rings = [simplify_ring(r) for r in poly]
            if rings[0] is None:
                if i != largest:
                    continue
                rings[0] = poly[0]  # nunca perder a província inteira
            rings = [r for r in rings if r and ring_area(r) >= MIN_AREA / 4 or r is rings[0]]
            out_polys.append(
                [[[round(x, DIGITS), round(y, DIGITS)] for x, y in r + [r[0]]] for r in rings]
            )
        features.append(
            {
                "type": "Feature",
                "properties": {"name": NAMES[fid]},
                "geometry": {"type": "MultiPolygon", "coordinates": out_polys},
            }
        )

    OUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    n_in = sum(len(r) for _, polys in feats for poly in polys for r in poly)
    n_out = sum(len(r) for f in features for poly in f["geometry"]["coordinates"] for r in poly)
    print(f"{OUT.relative_to(ROOT)}: {len(features)} províncias, {n_in:,} → {n_out:,} vértices, "
          f"{OUT.stat().st_size / 1024:.0f} kB")


if __name__ == "__main__":
    main()
