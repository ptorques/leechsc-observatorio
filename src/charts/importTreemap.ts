import type { TreeNode } from '../data/placeholder';
import { baseOption, tooltip } from '../lib/charts';
import { fmt } from '../lib/format';
import type { Builder, Params } from './types';

/** Treemap with drill-down: click a category to zoom into its products. */
export const importTreemap: Builder<TreeNode[]> = ({ data }, t) => {
  const palette = [t.red, t.green, t.ochre, t.slate, '#7a4a3a', t.taupe];
  return {
    ...baseOption(t),
    legend: { show: false },
    tooltip: tooltip(t, {
      formatter: (p: Params) => {
        const path = (p.treePathInfo as { name: string }[]).slice(1).map((n) => n.name).join(' › ');
        return `<b>${path}</b><br/>US$ ${fmt.format(p.value)} mi`;
      },
    }),
    series: [
      {
        type: 'treemap',
        name: 'Importações da China', // root label in the breadcrumb
        top: 4,
        left: 0,
        right: 0,
        bottom: 36,
        roam: false,
        nodeClick: 'zoomToNode',
        leafDepth: 1,
        animationDurationUpdate: 700,
        data: data.map((d, i) => ({ ...d, itemStyle: { color: palette[i % palette.length] } })),
        breadcrumb: {
          bottom: 4,
          height: 24,
          itemStyle: { color: t.surface, borderColor: t.border, textStyle: { color: t.text, fontFamily: t.font } },
          emphasis: { itemStyle: { color: t.bg } },
        },
        label: { fontFamily: t.font, fontSize: 14, color: '#f9f5ec', formatter: '{b}' },
        upperLabel: { show: true, height: 26, fontFamily: t.font, color: '#f9f5ec' },
        itemStyle: { borderColor: t.bg, borderWidth: 3, gapWidth: 3 },
        levels: [
          { itemStyle: { borderWidth: 0, gapWidth: 4 } },
          { colorSaturation: [0.3, 0.55], itemStyle: { gapWidth: 2, borderColorSaturation: 0.5 } },
        ],
      },
    ],
  };
};
