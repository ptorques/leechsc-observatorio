// Registry: the `name` passed to <Chart name="…"> picks a builder here.
import { footprintMap } from './footprintMap';
import { officialsEvent } from './officialsEvent';
import { partnerShare } from './partnerShare';
import { sankey } from './sankey';
import { sectorRadar } from './sectorRadar';
import { urbanHistory } from './urbanHistory';
import type { Builder } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const builders: Record<string, Builder<any>> = {
  'partner-share': partnerShare,
  sankey,
  'footprint-map': footprintMap,
  'sector-radar': sectorRadar,
  'officials-event': officialsEvent,
  'urban-history': urbanHistory,
};
