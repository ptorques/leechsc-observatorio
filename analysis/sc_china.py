"""
Santa Catarina × China: dados reais para a aba "Raison d'être".

Lê as fontes brutas em exploratory/ (não versionadas) e grava um único JSON
pequeno em src/data/sc-china.json, que o site importa.

Fontes
  - Comex Stat (MDIC): comércio de SC por capítulo SH2 e país, 2015–2025.
    Baixado pela API pública e guardado em exploratory/comex_*.csv.
    Atenção: na API, o código de SC é 44 (não o 42 do IBGE, que lá é o Paraná).
  - Alfândega da China: comércio de cada província por capítulo SH2 (2024).
  - CEADS: matriz insumo-produto inter-regional da China, 31 províncias × 42 setores, 2020.

Uso:  python analysis/sc_china.py   (a partir da raiz do repositório)
"""

from __future__ import annotations

import csv
import io
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
EXP = ROOT / "exploratory"
OUT = ROOT / "src" / "data" / "sc-china.json"
MRIO_XLSX = EXP / "MIP por província - 2020.xlsx"
PAUTA_XLSX = EXP / "Pauta_provincias_China_SH2_2015_2019_2024 (2).xlsx"
YEAR = "2024"        # ano das seções insumo-produto (dados da Alfândega da China)
TRADE_YEAR = "2025"  # ano das seções só com o Comex Stat (parceiros e exportações)


# ---------------------------------------------------------------------------
# Províncias: ordem da MIP, nome na pauta, nome em português, nome curto em
# chinês e macrorregião oficial.
# ---------------------------------------------------------------------------
PROV = [
    ("Beijing", "Beijing", "Pequim", "北京", "Leste"),
    ("Tianjin", "Tianjin", "Tianjin", "天津", "Leste"),
    ("Hebei", "Hebei", "Hebei", "河北", "Leste"),
    ("Shanxi", "Shanxi", "Shanxi", "山西", "Centro"),
    ("Inner Mongolia", "Inner Mongolia", "Mongólia Interior", "内蒙古", "Oeste"),
    ("Liaoning", "Liaoning", "Liaoning", "辽宁", "Nordeste"),
    ("Jilin", "Jilin", "Jilin", "吉林", "Nordeste"),
    ("Heilongjiang", "Heilongjiang", "Heilongjiang", "黑龙江", "Nordeste"),
    ("Shanghai", "Shanghai", "Xangai", "上海", "Leste"),
    ("Jiangsu", "Jiangsu", "Jiangsu", "江苏", "Leste"),
    ("Zhejiang", "Zhejiang", "Zhejiang", "浙江", "Leste"),
    ("Anhui", "Anhui", "Anhui", "安徽", "Centro"),
    ("Fujian", "Fujian", "Fujian", "福建", "Leste"),
    ("Jiangxi", "Jiangxi", "Jiangxi", "江西", "Centro"),
    ("Shandong", "Shandong", "Shandong", "山东", "Leste"),
    ("Henan", "Henan", "Henan", "河南", "Centro"),
    ("Hubei", "Hubei", "Hubei", "湖北", "Centro"),
    ("Hunan", "Hunan", "Hunan", "湖南", "Centro"),
    ("Guangdong", "Guangdong", "Guangdong", "广东", "Leste"),
    ("Guangxi", "Guangxi", "Guangxi", "广西", "Oeste"),
    ("Hainan", "Hainan", "Hainan", "海南", "Leste"),
    ("Chongqing", "Chongqing", "Chongqing", "重庆", "Oeste"),
    ("Sichuan", "Sichuan", "Sichuan", "四川", "Oeste"),
    ("Guizhou", "Guizhou", "Guizhou", "贵州", "Oeste"),
    ("Yunnan", "Yunnan", "Yunnan", "云南", "Oeste"),
    ("Xizang", "Tibet", "Tibete", "西藏", "Oeste"),
    ("Shaanxi", "Shaanxi", "Shaanxi", "陕西", "Oeste"),
    ("Gansu", "Gansu", "Gansu", "甘肃", "Oeste"),
    ("Qinghai", "Qinghai", "Qinghai", "青海", "Oeste"),
    ("Ningxia", "Ningxia", "Ningxia", "宁夏", "Oeste"),
    ("Xinjiang", "Xinjiang", "Xinjiang", "新疆", "Oeste"),
]
NP, NS = len(PROV), 42
PAUTA_TO_I = {p[1]: i for i, p in enumerate(PROV)}

# ---------------------------------------------------------------------------
# Capítulo SH2 → setor da MIP (1–42). Correspondência aproximada, no nível de
# capítulo; os capítulos 84 e 85 são repartidos entre setores.
# ---------------------------------------------------------------------------
def sector_of(ch: int) -> dict[int, float]:
    fixed = {
        1: 1, 3: 1, 5: 1, 6: 1, 7: 1, 8: 1, 10: 1, 12: 1, 13: 1, 14: 1, 24: 1,
        2: 6, 4: 6, 9: 6, 11: 6, 15: 6, 16: 6, 17: 6, 18: 6, 19: 6, 20: 6, 21: 6, 22: 6, 23: 6,
        25: 5, 26: 4, 27: 11,
        41: 8, 42: 8, 43: 8, 61: 8, 62: 8, 64: 8, 65: 8, 67: 8,
        44: 9, 45: 9, 46: 9, 94: 9,
        47: 10, 48: 10, 49: 10, 95: 10,
        68: 13, 69: 13, 70: 13,
        72: 14, 74: 14, 75: 14, 76: 14, 78: 14, 79: 14, 80: 14, 81: 14,
        73: 15, 82: 15, 83: 15,
        86: 18, 87: 18, 88: 18, 89: 18,
        90: 21, 91: 21,
    }
    if ch in fixed:
        return {fixed[ch]: 1.0}
    if 28 <= ch <= 40:
        return {12: 1.0}
    if 50 <= ch <= 60 or ch == 63:
        return {7: 1.0}
    if ch == 84:  # máquinas: gerais, especiais, computadores
        return {16: 0.55, 17: 0.20, 20: 0.25}
    if ch == 85:  # elétricos e eletrônicos
        return {19: 0.45, 20: 0.55}
    return {22: 1.0}  # 66, 71, 92, 93, 96, 97, 99…

SECTOR_GROUPS = [  # para o Sankey do valor adicionado (setor de origem)
    ("Agropecuária", [1]),
    ("Mineração e energia", [2, 3, 4, 5, 11, 25, 26, 27]),
    ("Metalurgia", [14, 15]),
    ("Química e minerais não metálicos", [12, 13]),
    ("Máquinas e eletrônicos", [16, 17, 18, 19, 20, 21, 24]),
    ("Têxtil e outras manufaturas", [6, 7, 8, 9, 10, 22, 23]),
    ("Comércio e transporte", [29, 30]),
    ("Outros serviços", [28, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42]),
]

def import_group(ch: int) -> str:  # o que SC compra da China
    if ch in (84, 90, 91): return "Máquinas e instrumentos"
    if ch == 85: return "Eletroeletrônicos"
    if 72 <= ch <= 83: return "Metais e obras"
    if 28 <= ch <= 38: return "Químicos"
    if ch in (39, 40): return "Plásticos e borracha"
    if 50 <= ch <= 67: return "Têxteis, vestuário e calçados"
    if 86 <= ch <= 89: return "Veículos e partes"
    return "Outros produtos"

def export_group(ch: int) -> str:  # o que SC vende ao mundo
    if ch in (2, 16): return "Carnes"
    if ch in (10, 12, 23): return "Soja e grãos"
    if ch in (44, 94): return "Madeira e móveis"
    if ch in (84, 85): return "Máquinas e motores"
    if 72 <= ch <= 83: return "Metais e obras"
    if 50 <= ch <= 63: return "Têxtil e vestuário"
    if ch in (47, 48): return "Celulose e papel"
    if ch == 24: return "Fumo"
    if ch in (68, 69): return "Cerâmica e pedra"
    if ch == 87: return "Veículos e partes"
    return "Outros produtos"

def export_to_china_group(ch: int) -> str:
    if ch in (2, 16): return "Carnes"
    if ch in (10, 12, 23): return "Soja e grãos"
    if ch in (44, 47, 48, 94): return "Madeira e celulose"
    return "Outros produtos"

EU27 = {
    "Alemanha", "Áustria", "Bélgica", "Bulgária", "Chipre", "Croácia", "Dinamarca", "Eslováquia",
    "Eslovênia", "Espanha", "Estônia", "Finlândia", "França", "Grécia", "Hungria", "Irlanda",
    "Itália", "Letônia", "Lituânia", "Luxemburgo", "Malta", "Países Baixos (Holanda)",
    "Polônia", "Portugal", "Tcheca, República", "Romênia", "Suécia",
}

# ---------------------------------------------------------------------------
# Comex Stat
# ---------------------------------------------------------------------------
API = "https://api-comexstat.mdic.gov.br/general?language=pt"
SC = {"filter": "state", "values": [44]}  # Santa Catarina no Comex Stat
CN = {"filter": "country", "values": [160]}

def comex(name: str, flow: str, filters: list, details: list, frm="2015-01", to=f"{TRADE_YEAR}-12") -> pd.DataFrame:
    path = EXP / f"comex_{name}.csv"
    if not path.exists():
        body = dict(flow=flow, monthDetail=False, period={"from": frm, "to": to},
                    filters=filters, details=details, metrics=["metricFOB"])
        req = urllib.request.Request(API, data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json", "User-Agent": "leechsc-observatorio"})
        with urllib.request.urlopen(req, timeout=180) as r:
            pd.DataFrame(json.load(r)["data"]["list"]).to_csv(path, index=False)
    d = pd.read_csv(path, dtype={"year": str, "chapterCode": str})
    d["fob"] = d["metricFOB"].astype(float)
    if "chapterCode" in d:
        d["ch"] = d["chapterCode"].astype(int)
    return d

SPAN = f"2015_{TRADE_YEAR}"
x_country = comex(f"x_sc_country_{SPAN}", "export", [SC], ["country"])
m_country = comex(f"m_sc_country_{SPAN}", "import", [SC], ["country"])
m_cn_ch = comex(f"m_sc_cn_ch_{SPAN}", "import", [SC, CN], ["chapter"])
x_cn_ch = comex(f"x_sc_cn_ch_{SPAN}", "export", [SC, CN], ["chapter"])
x_ch_country = comex(f"e_sc_ch_country_{TRADE_YEAR}", "export", [SC], ["chapter", "country"], f"{TRADE_YEAR}-01", f"{TRADE_YEAR}-12")
m_cn_ncm = comex(f"m_sc_cn_ncm_{YEAR}", "import", [SC, CN], ["ncm"], f"{YEAR}-01", f"{YEAR}-12")
m_cn_ncm["hs6"] = m_cn_ncm.coNcm.astype(str).str.zfill(8).str[:6]
m_cn_ncm["ch"] = m_cn_ncm.hs6.str[:2].astype(int)
x_cn_ncm = comex(f"x_sc_cn_ncm_{YEAR}", "export", [SC, CN], ["ncm"], f"{YEAR}-01", f"{YEAR}-12")
x_cn_ncm["hs6"] = x_cn_ncm.coNcm.astype(str).str.zfill(8).str[:6]
x_cn_ncm["ch"] = x_cn_ncm.hs6.str[:2].astype(int)

def bloc(country: str) -> str:
    if country == "China": return "China"
    if country == "Estados Unidos": return "Estados Unidos"
    if country in EU27: return "União Europeia"
    if country == "Argentina": return "Argentina"
    return "Outros"

# --- 1. participação dos parceiros (2015–TRADE_YEAR) ---
partners = ["China", "Estados Unidos", "União Europeia", "Argentina", "Outros"]
years = sorted(x_country.year.unique())
partner_share = {}
for key, d in (("imports", m_country), ("exports", x_country)):
    t = d.assign(b=d.country.map(bloc)).pivot_table(index="year", columns="b", values="fob", aggfunc="sum").fillna(0)
    share = t.div(t.sum(axis=1), axis=0) * 100
    partner_share[key] = [{"name": p, "values": [round(float(share.loc[y, p]), 1) for y in years]} for p in partners]

tot = {k: d.groupby("year").fob.sum() for k, d in (("x", x_country), ("m", m_country))}
cn = {k: d[d.country == "China"].groupby("year").fob.sum() for k, d in (("x", x_country), ("m", m_country))}
TY = TRADE_YEAR
x_cn_ty = x_cn_ch[x_cn_ch.year == TY]
kpis = {
    "importShare": float(cn["m"][TY] / tot["m"][TY]),
    "exportShare": float(cn["x"][TY] / tot["x"][TY]),
    "importsFromChina": float(cn["m"][TY]),
    "exportsToChina": float(cn["x"][TY]),
    "importGrowth": float(cn["m"][TY] / cn["m"]["2015"]),
    "importRank": int((m_country[m_country.year == TY].groupby("country").fob.sum().rank(ascending=False))["China"]),
    "exportRank": int((x_country[x_country.year == TY].groupby("country").fob.sum().rank(ascending=False))["China"]),
    # carnes (02, 16) e soja e grãos (10, 12, 23) no total vendido à China
    "meatSoyShare": float(x_cn_ty[x_cn_ty.ch.isin([2, 16, 10, 12, 23])].fob.sum() / x_cn_ty.fob.sum()),
}

# --- 2. exportações de SC: produto → destino (TRADE_YEAR) ---
# Destinos: China, Estados Unidos, UE, Argentina e os dois maiores dos demais países.
e = x_ch_country.copy()
e["g"] = e.ch.map(export_group)
e["dest"] = e.country.map(bloc)
top_dest = e[e.dest == "Outros"].groupby("country").fob.sum().nlargest(2).index.tolist()
e.loc[e.country.isin(top_dest), "dest"] = e.country
flows = e.groupby(["g", "dest"]).fob.sum().div(1e6).reset_index()
flows = flows[flows.fob >= 3]
prod_order = e.groupby("g").fob.sum().sort_values(ascending=False).index.tolist()
prod_order = [p for p in prod_order if p != "Outros produtos"] + ["Outros produtos"]
dest_order = ["China"] + [d for d in e.groupby("dest").fob.sum().sort_values(ascending=False).index if d not in ("China", "Outros")] + ["Outros"]
export_sankey = {
    "unit": "US$ mi",
    "highlight": "China",
    "nodes": [{"name": p, "kind": "sc"} for p in prod_order]
    + [{"name": d, "kind": "china" if d == "China" else "other"} for d in dest_order],
    "links": [{"source": r.g, "target": r.dest, "value": round(r.fob, 1)} for r in flows.itertuples()],
}

# --- 3. grupos de produtos importados da China, do maior para o menor (ordem do sankey) ---
m24 = m_cn_ch[m_cn_ch.year == YEAR].copy()
m24["g"] = m24.ch.map(import_group)
groups = m24.groupby("g").fob.sum().sort_values(ascending=False).index.tolist()

# ---------------------------------------------------------------------------
# Pauta das províncias chinesas (2024)
# ---------------------------------------------------------------------------
pauta = pd.read_excel(PAUTA_XLSX, sheet_name="Dados", dtype=str)
pauta = pauta[pauta.Ano == YEAR].copy()
pauta["v"] = pauta["Valor (US$)"].astype(float)
pauta["ch"] = pauta["Capítulo SH2"].astype(int)
pauta["p"] = pauta["Província"].map(PAUTA_TO_I)
assert pauta.p.notna().all()

def prov_shares(flow: str) -> dict[int, np.ndarray]:
    """Participação de cada província no comércio da China, por capítulo."""
    t = pauta[pauta.Fluxo == flow].pivot_table(index="ch", columns="p", values="v", aggfunc="sum").fillna(0)
    t = t.reindex(columns=range(NP), fill_value=0)
    return {int(ch): (row / row.sum()).to_numpy() for ch, row in t.iterrows() if row.sum() > 0}

x_shares = prov_shares("Exportação")
m_shares = prov_shares("Importação")

# ---------------------------------------------------------------------------
# Comércio da China com o Brasil por província e SH6 (Alfândega da China,
# consulta em stats.customs.gov.cn: parceiro Brasil × produto SH6 × local de
# registro do importador/exportador). A consulta devolve no máximo 10 mil linhas,
# então um fluxo pode vir em vários arquivos; as linhas repetidas são removidas.
# ---------------------------------------------------------------------------
GB_CODE = {  # código GB/T 2260 da província → posição em PROV
    11: 0, 12: 1, 13: 2, 14: 3, 15: 4, 21: 5, 22: 6, 23: 7, 31: 8, 32: 9, 33: 10,
    34: 11, 35: 12, 36: 13, 37: 14, 41: 15, 42: 16, 43: 17, 44: 18, 45: 19, 46: 20,
    50: 21, 51: 22, 52: 23, 53: 24, 54: 25, 61: 26, 62: 27, 63: 28, 64: 29, 65: 30,
}

def read_customs_br(pattern: str) -> pd.DataFrame:
    """hs6, p (província) e usd. A descrição do produto às vezes vem com aspas
    quebradas, então só os campos das pontas de cada linha são usados. O portal
    exporta as colunas em duas ordens: parceiro primeiro ou produto primeiro."""
    rows = []
    for path in sorted(EXP.glob(pattern)):
        text = path.read_bytes().decode("utf-8", errors="replace")
        table = list(csv.reader(io.StringIO(text)))
        code_col = 0 if table[0][0].strip().startswith("Commodity") else 2
        lines = [r for r in table[1:] if len(r) >= 8 and "Brazil" in r]
        if len(lines) >= 10_000:  # arquivo cortado no limite: o último SH6 pode estar incompleto
            lines = [r for r in lines if r[code_col] != lines[-1][code_col]]
        rows += [(r[code_col], GB_CODE[int(r[-4])], float(r[-2].replace(",", ""))) for r in lines]
    if not rows:
        sys.exit(f"faltam os arquivos {pattern} em {EXP}")
    return pd.DataFrame(rows, columns=["hs6", "p", "usd"]).drop_duplicates(["hs6", "p"])

def br_shares(d: pd.DataFrame) -> tuple[dict[str, np.ndarray], dict[int, np.ndarray]]:
    """Participação de cada província por SH6 e, como reserva, por capítulo."""
    def shares(key):
        t = d.pivot_table(index=key, columns="p", values="usd", aggfunc="sum").reindex(columns=range(NP), fill_value=0).fillna(0)
        return {k: (row / row.sum()).to_numpy() for k, row in t.iterrows() if row.sum() > 0}
    return shares("hs6"), shares(d.hs6.str[:2].astype(int).rename("ch"))

cn_imp_br = read_customs_br("Importações BR-CH*.csv")   # importações chinesas vindas do Brasil
m_br_hs6, m_br_ch = br_shares(cn_imp_br)
cn_exp_br = read_customs_br("Exportações BR-CH*.csv")   # exportações chinesas para o Brasil
x_br_hs6, x_br_ch = br_shares(cn_exp_br)

# importações de SC vindas da China por SH6, e quanto delas os arquivos acima cobrem
m6 = m_cn_ncm.groupby(["hs6", "ch"]).fob.sum().reset_index()
m6["g"] = m6.ch.map(import_group)
x_br_cover = m6[m6.hs6.isin(x_br_hs6)].fob.sum() / m6.fob.sum()
USE_BR_EXPORTS = x_br_cover >= 0.95
if not USE_BR_EXPORTS:
    print(f"AVISO: Exportações BR-CH cobrem só {x_br_cover:.0%} das importações de SC (SH6); "
          "a pegada usa a repartição antiga (capítulo × exportações da China ao mundo).")

# ---------------------------------------------------------------------------
# MIP inter-regional da China (CEADS, 2020)
# ---------------------------------------------------------------------------
cache = EXP / "_mrio2020_raw.pkl"
raw = pd.read_pickle(cache) if cache.exists() else pd.read_excel(MRIO_XLSX, sheet_name="Table_2020_English Version", header=None)
assert str(raw.iloc[1306, 2]).strip() == "IM" and str(raw.iloc[1312, 2]).strip() == "TVA"
N = NP * NS
num = lambda block: block.apply(pd.to_numeric, errors="coerce").fillna(0).to_numpy()
Z = num(raw.iloc[4:4 + N, 3:3 + N])
F = num(raw.iloc[4:4 + N, 1306:1306 + 5 * NP])          # demanda final: 31 províncias × 5 categorias
x = num(raw.iloc[4:4 + N, [1464]]).ravel()              # produção bruta
va = num(raw.iloc[[1312], 3:3 + N]).ravel()             # valor adicionado
im = num(raw.iloc[[1306], 3:3 + N]).ravel()             # insumos importados
assert np.allclose(Z.sum(0) + im + va, x, rtol=1e-6, atol=1)

xs = np.where(x > 0, x, 1)
A = Z / xs
v_coef = np.where(x > 0, va / xs, 0)
m_coef = np.where(x > 0, im / xs, 0)
L = np.linalg.inv(np.eye(N) - A)
idx = lambda p, s: p * NS + (s - 1)

# --- 4. a pegada das compras catarinenses na China, no total e por grupo de produto ---
f = np.zeros(N)                     # US$, por província-setor exportador
f_group = {}                        # mesmo vetor, separado por grupo de produto
# Com os arquivos da Alfândega por SH6, cada produto comprado por SC é repartido
# segundo as exportações chinesas desse SH6 para o Brasil (na falta dele, do
# capítulo); sem eles, segundo as exportações da China ao mundo por capítulo.
x_matched = {"SH6": 0.0, "capítulo (Brasil)": 0.0, "capítulo (mundo)": 0.0}
for r in (m6 if USE_BR_EXPORTS else m24).itertuples():
    if USE_BR_EXPORTS:
        sh, how = x_br_hs6.get(r.hs6), "SH6"
        if sh is None:
            sh, how = x_br_ch.get(int(r.ch)), "capítulo (Brasil)"
    else:
        sh = None
    if sh is None:
        sh, how = x_shares.get(int(r.ch)), "capítulo (mundo)"
    if sh is None:
        continue
    x_matched[how] += r.fob
    for s, w in sector_of(int(r.ch)).items():
        # províncias sem produção relevante no setor: redistribui entre as demais
        ok = np.array([x[idx(p, s)] > 1e3 for p in range(NP)])
        shp = sh * ok
        shp = shp / shp.sum() if shp.sum() > 0 else ok / ok.sum()
        for p in range(NP):
            val = r.fob * w * shp[p]
            f[idx(p, s)] += val
            f_group.setdefault(r.g, np.zeros(N))[idx(p, s)] += val

by_p = lambda v: v.reshape(NP, NS).sum(1)
mi = lambda v: [round(float(x) / 1e6, 1) for x in by_p(v)]

def footprint_of(name: str, fv: np.ndarray) -> dict:
    """Compras diretas, valor adicionado total (v̂Lf) e só no elo exportador (v̂f), por província."""
    return {"name": name, "purchases": mi(fv), "va": mi(v_coef * (L @ fv)), "vaDirect": mi(v_coef * fv)}

va_total = v_coef * (L @ f)          # US$ de valor adicionado chinês, por província-setor
va_direct = v_coef * f               # só no elo exportador
foreign = float(m_coef @ (L @ f))    # conteúdo importado de outros países
footprint = {
    "provinces": [{"name": PROV[p][2], "zh": PROV[p][3], "region": PROV[p][4]} for p in range(NP)],
    "sectors": [footprint_of("Todos os produtos", f)] + [footprint_of(g, f_group[g]) for g in groups],
    "totals": {
        "purchases": round(f.sum() / 1e6, 1),
        "va": round(va_total.sum() / 1e6, 1),
        "foreign": round(foreign / 1e6, 1),
        "vaOutsideExporters": round((va_total.sum() - va_direct.sum()) / 1e6, 1),
        "provincesOver100": int((by_p(va_total) >= 100e6).sum()),
    },
}

# Sankeys de três camadas: ao clicar num nó das pontas, o site mostra só os fluxos
# que passam por ele. As ligações agregadas não bastam para isso (a ligação
# setor → produto não diz de que região veio), então essas vistas são calculadas
# aqui, a partir de cada caminho (esquerda, meio, direita, valor em US$).
# Mesmo limite para a vista geral e para as vistas, e só ligações entre nós
# desenhados: o site anima a partir das ligações da vista geral, então uma ligação
# que só existisse na vista sumiria e deixaria um nó com entrada e sem saída.
MIN_LINK = 1e4  # US$ 10 mil

def sankey_links(lk: dict[tuple[str, str], float], nodes: set[str]) -> list[dict]:
    return [{"source": a, "target": b, "value": round(v / 1e6, 2)} for (a, b), v in lk.items()
            if v >= MIN_LINK and a in nodes and b in nodes]

def end_views(paths: dict[tuple[str, str, str], float], nodes: set[str]) -> dict[str, list[dict]]:
    views = {}
    for pos in (0, 2):
        for node in {k[pos] for k in paths} & nodes:
            lk: dict[tuple[str, str], float] = {}
            for (a, b, c), v in paths.items():
                if (a, b, c)[pos] == node:
                    lk[(a, b)] = lk.get((a, b), 0) + v
                    lk[(b, c)] = lk.get((b, c), 0) + v
            views[node] = sankey_links(lk, nodes)
    return views

# --- 5. Sankey: região de origem → setor de origem → produto comprado por SC ---
sec_group = np.empty(N, dtype=object)
reg = np.empty(N, dtype=object)
for p in range(NP):
    for name, secs in SECTOR_GROUPS:
        for s in secs:
            sec_group[idx(p, s)] = name
            reg[idx(p, s)] = PROV[p][4]
va_paths: dict[tuple[str, str, str], float] = {}  # (região, setor, produto) → US$
for g, fg in f_group.items():
    vg = v_coef * (L @ fg)
    for k in np.nonzero(vg > 0)[0]:
        key3 = (reg[k], sec_group[k], g)
        va_paths[key3] = va_paths.get(key3, 0) + vg[k]
    va_paths[("Exterior", "Insumos importados", g)] = float(m_coef @ (L @ fg))
links: dict[tuple[str, str], float] = {}
for (a, b, c), v in va_paths.items():
    links[(a, b)] = links.get((a, b), 0) + v
    links[(b, c)] = links.get((b, c), 0) + v
regions = ["Leste", "Centro", "Oeste", "Nordeste", "Exterior"]
sectors = [n for n, _ in SECTOR_GROUPS] + ["Insumos importados"]
va_sankey = {
    "unit": "US$ mi",
    "nodes": [{"name": r, "kind": "other" if r == "Exterior" else "china"} for r in regions]
    + [{"name": x, "kind": "other" if x == "Insumos importados" else "neutral"} for x in sectors]
    + [{"name": g, "kind": "sc"} for g in groups],
    "links": sankey_links(links, set(regions) | set(sectors) | set(groups)),
    "views": end_views(va_paths, set(regions) | set(sectors) | set(groups)),
}

# --- 6. Sankey: exportações de SC → província importadora → uso na China ---
USES = [  # (rótulo, setores usuários) — demanda final tratada à parte
    ("Agropecuária", [1]),
    ("Indústria de alimentos", [6]),
    ("Outras indústrias", [s for s in range(2, 28) if s != 6]),
    ("Construção", [28]),
    ("Restaurantes e hotéis", [31]),
    ("Outros serviços", [s for s in range(29, 43) if s != 31]),
]
FD_USES = [("Consumo das famílias", [0, 1]), ("Consumo do governo", [2]), ("Investimento", [3, 4])]
# A MIP agrega a soja com o resto da agropecuária, cujo uso típico (hortaliças,
# frutas…) inclui muito consumo direto das famílias. A soja em grão importada pela
# China, porém, vai quase toda para o esmagamento (óleo e farelo para ração), que
# está no setor de alimentos. Para esse capítulo, o uso é fixado nesse setor.
USE_OVERRIDE = {12: "Indústria de alimentos"}
# Cada SH6 exportado por SC é repartido entre as províncias segundo as importações
# chinesas vindas do Brasil desse mesmo SH6; na falta dele, do capítulo.
x6 = x_cn_ncm.groupby(["hs6", "ch"]).fob.sum().reset_index()
x6["g"] = x6.ch.map(export_to_china_group)
assert abs(x6.fob.sum() - x_cn_ch[x_cn_ch.year == YEAR].fob.sum()) < 1e3
flow3: dict[tuple[str, str], float] = {}
add3 = lambda a, b, v: flow3.__setitem__((a, b), flow3.get((a, b), 0) + v)
prov_val = np.zeros(NP)
alloc = []  # (grupo, capítulo, província, setor, valor)
matched = {"SH6": 0.0, "capítulo": 0.0, "sem dados": 0.0}
for r in x6.itertuples():
    sh, how = m_br_hs6.get(r.hs6), "SH6"
    if sh is None:
        sh, how = m_br_ch.get(int(r.ch)), "capítulo"
    if sh is None:
        sh, how = m_shares.get(int(r.ch)), "sem dados"
    matched[how] += r.fob
    if sh is None:
        continue
    for s, w in sector_of(int(r.ch)).items():
        for p in range(NP):
            val = r.fob * w * sh[p]
            if val > 0:
                alloc.append((r.g, int(r.ch), p, s, val))
                prov_val[p] += val
top_p = set(np.argsort(-prov_val)[:8])
pname = lambda p: PROV[p][2] if p in top_p else "Outras províncias"
use_by_product: dict[tuple[str, str], float] = {}  # só para conferência
use_paths: dict[tuple[str, str, str], float] = {}  # (produto, província, uso) → US$
for g, ch, p, s, val in alloc:
    if ch in USE_OVERRIDE:
        parts = {USE_OVERRIDE[ch]: 1.0}
    else:
        rows = [idx(o, s) for o in range(NP)]  # produto s de qualquer origem, usado na província p
        use_int = Z[rows][:, p * NS:(p + 1) * NS].sum(0)
        use_fd = F[rows][:, p * 5:(p + 1) * 5].sum(0)
        parts = {lab: use_int[[k - 1 for k in secs]].sum() for lab, secs in USES}
        parts.update({lab: use_fd[cols].sum() for lab, cols in FD_USES})
    tot_use = sum(parts.values())
    add3(g, pname(p), val)
    for lab, u in parts.items():
        add3(pname(p), lab, val * u / tot_use)
        key3 = (g, pname(p), lab)
        use_paths[key3] = use_paths.get(key3, 0) + val * u / tot_use
        use_by_product[(g, lab)] = use_by_product.get((g, lab), 0) + val * u / tot_use
prods = ["Carnes", "Soja e grãos", "Madeira e celulose", "Outros produtos"]
provs = [PROV[p][2] for p in sorted(top_p, key=lambda p: -prov_val[p])] + ["Outras províncias"]
uses = [u for u, _ in USES] + [u for u, _ in FD_USES]
use_sankey = {
    "unit": "US$ mi",
    "nodes": [{"name": n, "kind": "sc"} for n in prods]
    + [{"name": n, "kind": "china"} for n in provs]
    + [{"name": n, "kind": "neutral"} for n in uses if sum(v for (a, b), v in flow3.items() if b == n) >= 1e6],
}
use_nodes = {n["name"] for n in use_sankey["nodes"]}
use_sankey["links"] = sankey_links(flow3, use_nodes)
use_sankey["views"] = end_views(use_paths, use_nodes)
dropped = sum(v for (a, b, c), v in use_paths.items() if c not in use_nodes)
print(f"usos pequenos demais para o gráfico: US$ {dropped / 1e6:.2f} mi")

data = {
    "year": int(YEAR),
    "tradeYear": int(TRADE_YEAR),
    "kpis": kpis,
    "partnerShare": {"years": [int(y) for y in years], **partner_share},
    "exportSankey": export_sankey,
    "footprint": footprint,
    "vaSankey": va_sankey,
    "useSankey": use_sankey,
}
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"gravado {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.1f} KB)")

# --- resumo para conferência ---
print("KPIs:", {k: round(v, 3) for k, v in kpis.items()})
print("Pegada:", footprint["totals"], "| soma VA + exterior / compras:",
      round((va_total.sum() + foreign) / f.sum(), 4))
for sec in footprint["sectors"]:
    fp = pd.DataFrame({k: sec[k] for k in ("purchases", "va", "vaDirect")}, index=[q["name"] for q in footprint["provinces"]])
    fp["indireto%"] = (1 - fp.vaDirect / fp.va).round(2)
    print(f"\n{sec['name']}: compras {fp.purchases.sum():.0f}, VA {fp.va.sum():.0f} (US$ mi)")
    print(fp.sort_values("va", ascending=False).head(6).to_string())
lk = pd.Series(links).div(1e6)
print("VA por setor de origem (US$ mi):\n", lk[lk.index.get_level_values(0).isin(regions)].groupby(level=1).sum().round(0).to_string())
print("VA por setor × grupo importado (participação no grupo):\n",
      lk[lk.index.get_level_values(1).isin(groups)].unstack(1).pipe(lambda t: t / t.sum()).round(2).to_string())
print("Importações de SC vindas da China repartidas por:", {k: f"{v / m24.fob.sum():.1%}" for k, v in x_matched.items()})
print("Exportações de SC à China repartidas por:", {k: f"{v / x6.fob.sum():.1%}" for k, v in matched.items()})
print("Províncias importadoras (US$ mi):", {PROV[p][2]: round(prov_val[p] / 1e6) for p in np.argsort(-prov_val)[:10]})
ub = pd.Series(use_by_product).div(1e6).unstack(1)
print("Uso provável por produto (participação):\n", ub.div(ub.sum(axis=1), axis=0).round(2).T.to_string())
