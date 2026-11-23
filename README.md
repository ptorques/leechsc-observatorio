# Observatório — Laboratório Santa Catarina–China

Site do Laboratório Santa Catarina–China (UFSC · Instituto I-Chin): por que estudamos a China, nossos projetos e a equipe.

## Stack

- **[Astro](https://astro.build)**: site estático. As páginas são HTML puro; só os gráficos carregam JavaScript.
- **[Apache ECharts](https://echarts.apache.org)**: visualizações interativas.
- **Latin Modern**: a fonte do LaTeX, servida localmente (`src/assets/fonts/`, via [latex.css](https://github.com/vincentdoerig/latex-css), licença GUST).
- **GitHub Pages**: deploy automático a cada push na `main`.

## Começando

Requer Node.js 22.23.4 ou superior (recomendado: Node 24).

```sh
npm install
npm run dev       # http://localhost:4321/leechsc-observatorio/
npm run build     # checagem de tipos + build em dist/
npm run preview   # serve o build localmente
```

## Estrutura

```
src/
  pages/
    index.astro          aba "Raison d'être": visualizações que motivam o laboratório
    projetos.astro       aba "Projetos": um gráfico + explicação + link por projeto
    sobre.astro          aba "Sobre nós": apresentação e equipe
  content/projects/      um .md por projeto ativo (texto + metadados)
  data/
    sc-china.json        dados reais SC × China (gerado por analysis/sc_china.py; não editar à mão)
    scChina.ts           tipos e importação do JSON acima
    china-geo.json       contornos simplificados das províncias (gerado por analysis/china_map.py)
    placeholder.ts       ⚠️ dados aleatórios provisórios (gráficos dos projetos)
    team.ts              membros da equipe
  charts/                um "builder" por gráfico + registro (index.ts)
  components/
    Chart.astro          figura numerada estilo LaTeX que monta um gráfico
    Masthead.astro       logo, título e abas
    LangSwitcher.astro   seletor PT · EN · 中文
  i18n/ui.ts             idiomas e textos da interface
  lib/charts.ts          configuração compartilhada do ECharts (lê as cores do CSS)
  styles/global.css      tema: tokens de cor, tipografia
public/team/             fotos da equipe
analysis/
  sc_china.py            pipeline de dados da aba "Raison d'être"
  china_map.py           simplifica exploratory/cn.json para o mapa
exploratory/             dados brutos e rascunhos locais (fora do git)
```

## Dados

A aba "Raison d'être" usa dados reais, preparados por `analysis/sc_china.py`:

- **Comex Stat (MDIC)**: comércio de SC por capítulo SH e país, 2015–2025 (seções 1 e 2), e por produto NCM em 2024 (seções 3 a 5, o ano dos dados da Alfândega da China). O ano de cada parte fica em `TRADE_YEAR` e `YEAR` no topo do script. O script baixa pela API pública e guarda uma cópia em `exploratory/comex_*.csv` (apague-as para baixar de novo). Na API, Santa Catarina é o código **44**, não o 42 do IBGE (que lá é o Paraná).
- **Alfândega da China**: comércio de cada província por capítulo SH (`exploratory/Pauta_provincias_China_SH2_2015_2019_2024 (2).xlsx`).
- **Alfândega da China × Brasil**: comércio da China com o Brasil por SH6 e província do importador/exportador, 2024, baixado em [stats.customs.gov.cn](http://stats.customs.gov.cn) (parceiro Brasil × produto SH6 × local de registro). Ficam em `exploratory/Importações BR-CH*.csv` e `exploratory/Exportações BR-CH*.csv`; a consulta devolve no máximo 10 mil linhas, então um fluxo pode vir em vários arquivos (o script junta todos).
- **CEADS**: matriz insumo-produto inter-regional da China, 31 províncias × 42 setores, 2020 (`exploratory/MIP por província - 2020.xlsx`).

Com esses arquivos em `exploratory/`, rode a partir da raiz (Python 3 com pandas, numpy e openpyxl):

```sh
python analysis/sc_china.py
```

O script grava `src/data/sc-china.json` e imprime um resumo para conferência. O mapa usa `src/data/china-geo.json`, gerado por `python analysis/china_map.py` a partir de `exploratory/cn.json` (GeoJSON das províncias, simplemaps.com, ~7,5 MB) (simplifica as fronteiras sem abrir frestas entre províncias vizinhas); o navegador só baixa esse arquivo quando o mapa entra na tela. A nota metodológica no fim da página descreve as hipóteses (correspondência SH → setor, alocação por província, Leontief).

## Tarefas comuns

**Trocar dados aleatórios por reais**: gere os dados no pipeline de `analysis/`, mantendo o formato que o builder espera (os tipos indicam qual é), e passe `placeholder={false}` e `source="…"` ao `<Chart>` para tirar o aviso "(dados ilustrativos)" e citar a fonte.

**Adicionar um gráfico**:
1. Crie `src/charts/meuGrafico.ts` exportando um `Builder` (veja os existentes).
2. Registre-o em `src/charts/index.ts` com um nome.
3. Use `<Chart name="meu-grafico" data={...} caption="..." />` em uma página.
4. Se usar um tipo novo do ECharts (mapa, pizza…), registre-o em `src/lib/charts.ts`.

Controles interativos vão no slot `controls` do `<Chart>`: um `<select data-control="x">` ou botões `<button data-control="x" data-value="..." aria-pressed="true|false">`. O builder lê o valor com `control('x')`.

**Adicionar um projeto**: crie um `.md` em `src/content/projects/` com `title`, `order`, `chart`, `caption` e, quando existir, `article` (URL). O corpo é a explicação curta.

**Equipe**: edite `src/data/team.ts` e coloque as fotos (quadradas, ~400 px) em `public/team/`.

**Traduções**: o seletor de idioma já reserva PT, EN e 中文. Para ativar um idioma, preencha os textos em `src/i18n/ui.ts`, crie as páginas traduzidas e marque `ready: true`.

**Cores**: tokens em `src/styles/global.css` (bege, vermelho profundo, verde). Os gráficos usam as mesmas variáveis.

## Créditos

Ícone do dragão: [Fluent Emoji High Contrast](https://github.com/microsoft/fluentui-emoji) (Microsoft, MIT).

## Deploy

`.github/workflows/deploy.yml` publica no GitHub Pages a cada push na `main`. No repositório, ative **Settings → Pages → Source: GitHub Actions**. Para domínio próprio, ajuste `site` e `base` em `astro.config.mjs`.
