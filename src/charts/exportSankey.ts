import type { Flow } from '../data/placeholder';
import { baseOption, tooltip } from '../lib/charts';
import { fmt } from '../lib/format';
import type { Builder, Params } from './types';

/** Sankey: SC export products flowing to destinations. Hover a node to isolate its flows. */
export const exportSankey: Builder<Flow> = ({ data }, t) => ({
  ...baseOption(t),
  tooltip: tooltip(t, {
    trigger: 'item',
    formatter: (p: Params) =>
      p.dataType === 'edge'
        ? `${p.data.source} → <b>${p.data.target}</b><br/>US$ ${fmt.format(p.data.value)} mi`
        : `<b>${p.name}</b><br/>US$ ${fmt.format(p.value)} mi`,
  }),
  series: [
    {
      type: 'sankey',
      left: 8,
      right: 110,
      top: 8,
      bottom: 8,
      nodeWidth: 12,
      nodeGap: 12,
      draggable: false,
      emphasis: { focus: 'adjacency' },
      label: { color: t.text, fontFamily: t.font, fontSize: 13 },
      lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.3 },
      data: data.nodes.map((n) => ({
        name: n.name,
        itemStyle: {
          color: n.name === 'China' ? t.red : n.kind === 'product' ? t.green : t.slate,
          borderWidth: 0,
        },
        label: n.name === 'China' ? { fontWeight: 'bold', color: t.red } : undefined,
      })),
      links: data.links,
    },
  ],
});
