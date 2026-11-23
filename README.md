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
    placeholder.ts       ⚠️ dados aleatórios provisórios de todos os gráficos
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
```

## Tarefas comuns

**Trocar dados aleatórios por reais**: substitua a exportação correspondente em `src/data/placeholder.ts` mantendo o mesmo formato (os tipos indicam qual é) e remova `placeholder` do `<Chart>` para tirar o aviso "(dados ilustrativos)".

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
