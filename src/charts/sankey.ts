import type { Flow, NodeKind } from '../data/scChina';
import { baseOption, tooltip } from '../lib/charts';
import { fmt } from '../lib/format';
import type { Builder, Params } from './types';

type Link = Flow['links'][number];
type Values = Record<string, number>;
const id = (l: { source: string; target: string }) => `${l.source} → ${l.target}`;
const valuesOf = (links: Link[]): Values => Object.fromEntries(links.map((l) => [id(l), l.value]));

/** What a click on `node` shows: a view computed in the pipeline, or simply the links touching it. */
const viewOf = (data: Flow, node: string): Link[] =>
  data.views?.[node] ?? data.links.filter((l) => l.source === node || l.target === node);

/**
 * Sankey with two or more layers. Node colors come from `kind`: Santa Catarina
 * in green, China in red, third parties in slate, intermediate steps in taupe.
 * Nodes keep the order given in the data. Hover a node to highlight its flows;
 * click it to isolate them (click again, the "Ver tudo" link or an empty area to
 * return).
 *
 * ECharts redraws a sankey from scratch when its data changes, so the transition
 * is done here: the overview's nodes and links stay on screen and their values
 * are interpolated frame by frame towards the selected view (see `setup`).
 */
export const sankey: Builder<Flow> = ({ data, root, state }, t) => {
  const colors: Record<NodeKind, string> = { sc: t.green, china: t.red, other: t.slate, neutral: t.taupe };
  const kind = new Map(data.nodes.map((n) => [n.name, n.kind]));
  const selected = state.selected as string | undefined;
  const shown = (state.values as Values | undefined) ?? valuesOf(data.links);
  const links = data.links.map((l) => ({ ...l, value: shown[id(l)] ?? 0 }));

  // node sizes in this frame; (nearly) empty nodes and links are hidden
  const into: Values = {};
  const out: Values = {};
  for (const l of links) {
    out[l.source] = (out[l.source] ?? 0) + l.value;
    into[l.target] = (into[l.target] ?? 0) + l.value;
  }
  const total = Object.keys(out)
    .filter((n) => !(n in into))
    .reduce((a, n) => a + out[n], 0);
  const visible = (name: string) => Math.max(into[name] ?? 0, out[name] ?? 0) > total * 0.004;
  // only links that are (practically) zero, e.g. at the end of a transition; small real links stay
  const empty = (v: number) => v <= total * 1e-6;

  // room on the right for the labels of the last layer (nodes without outgoing links)
  const sources = new Set(data.links.map((l) => l.source));
  const longest = Math.max(...data.nodes.filter((n) => !sources.has(n.name)).map((n) => n.name.length));
  const narrow = root.clientWidth < 640;
  const fontSize = narrow ? 11 : 13;
  const money = (v: number) => `US$ ${fmt.format(v)} mi`;
  const hint = (name: string) =>
    `<br/><span style="color:${t.muted}">${selected === name ? 'Clique para voltar' : 'Clique para isolar seus fluxos'}</span>`;

  return {
    ...baseOption(t),
    animation: !state.animating,
    tooltip: tooltip(t, {
      trigger: 'item',
      formatter: (p: Params) =>
        p.dataType === 'edge'
          ? `${p.data.source} → <b>${p.data.target}</b><br/>${money(p.data.value)}`
          : `<b>${p.name}</b><br/>${money(p.value)}${hint(p.name)}`,
    }),
    series: [
      {
        type: 'sankey',
        left: 8,
        right: Math.min(longest * fontSize * 0.5 + 12, narrow ? 120 : 220),
        top: 28,
        bottom: 8,
        nodeWidth: 12,
        nodeGap: narrow ? 8 : 12,
        layoutIterations: 0,
        draggable: false,
        emphasis: { focus: 'adjacency' },
        label: { color: t.text, fontFamily: t.font, fontSize, overflow: 'truncate', width: narrow ? 110 : 210 },
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.28 },
        data: data.nodes.map((n) => ({
          name: n.name,
          itemStyle: { color: colors[n.kind], borderWidth: 0 },
          label: { show: visible(n.name), ...(n.name === 'China' ? { fontWeight: 'bold', color: t.red } : {}) },
          tooltip: { show: visible(n.name) },
          cursor: visible(n.name) ? 'pointer' : 'default',
        })),
        links: links.map((l) => ({
          ...l,
          tooltip: { show: !empty(l.value) },
          lineStyle: empty(l.value)
            ? { opacity: 0 } // an empty link would still draw as a hairline
            : data.highlight
              ? // one node in focus: its flows in red, everything else faded
                [l.source, l.target].includes(data.highlight)
                ? { color: t.red, opacity: 0.5 }
                : { color: t.taupe, opacity: 0.2 }
              : kind.get(l.source) === 'other'
                ? { color: t.slate, opacity: 0.3 }
                : {},
        })),
      },
    ],
    graphic: [
      {
        type: 'text',
        id: 'reset',
        name: 'reset',
        right: 8,
        top: 2,
        ignore: !selected,
        cursor: 'pointer',
        style: { text: '← Ver tudo', fill: t.red, font: `14px ${t.font}` },
      },
    ],
  };
};
sankey.rebuildOnResize = true;
sankey.setup = (chart, ctx, rerender) => {
  const overview = valuesOf(ctx.data.links);
  let frame = 0;

  const select = (name?: string) => {
    const target = name ? valuesOf(viewOf(ctx.data, name)) : overview;
    const start = { ...((ctx.state.values as Values | undefined) ?? overview) };
    ctx.state.selected = name;
    const t0 = performance.now();
    const ease = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2); // cubic in-out
    cancelAnimationFrame(frame);
    const step = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / 700));
      ctx.state.values = Object.fromEntries(
        Object.keys(overview).map((key) => [key, (start[key] ?? 0) + ((target[key] ?? 0) - (start[key] ?? 0)) * k]),
      );
      ctx.state.animating = k < 1;
      rerender();
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  chart.on('click', (p: Params) => {
    if (p.componentType === 'graphic') select(undefined);
    else if (p.dataType === 'node' && p.value > 0) select(ctx.state.selected === p.name ? undefined : p.name);
  });
  // a click on empty space also returns to the overview
  chart.getZr().on('click', (e: { target?: unknown }) => {
    if (!e.target && ctx.state.selected) select(undefined);
  });
};
