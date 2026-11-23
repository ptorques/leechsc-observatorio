// Registry: the `name` passed to <Chart name="…"> picks a builder here.
import { exportSankey } from './exportSankey';
import { importTreemap } from './importTreemap';
import { officialsEvent } from './officialsEvent';
import { partnerShare } from './partnerShare';
import { provinceBubble } from './provinceBubble';
import { sectorRadar } from './sectorRadar';
import { urbanHistory } from './urbanHistory';
import type { Builder } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const builders: Record<string, Builder<any>> = {
  'partner-share': partnerShare,
  'province-bubble': provinceBubble,
  'export-sankey': exportSankey,
  'import-treemap': importTreemap,
  'sector-radar': sectorRadar,
  'officials-event': officialsEvent,
  'urban-history': urbanHistory,
};
