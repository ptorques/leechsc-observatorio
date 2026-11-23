/**
 * Dados reais de Santa Catarina × China, gerados por analysis/sc_china.py
 * (Comex Stat, Alfândega da China e matriz insumo-produto do CEADS).
 * Não edite sc-china.json à mão: rode o script de novo.
 */
import raw from './sc-china.json';

export interface Series {
  name: string;
  values: number[];
}
export interface PartnerShare {
  years: number[];
  imports: Series[];
  exports: Series[];
}

export type NodeKind = 'sc' | 'china' | 'other' | 'neutral';
export interface Flow {
  unit: string;
  nodes: { name: string; kind: NodeKind }[];
  links: { source: string; target: string; value: number }[];
  /** node whose flows are drawn in red, with the rest faded */
  highlight?: string;
  /**
   * Links to show when a node is clicked, for nodes whose flows can't be read off
   * the aggregated links (the ends of a three-layer sankey). Other nodes show the
   * links that touch them.
   */
  views?: Record<string, { source: string; target: string; value: number }[]>;
}

export interface FootprintProvince {
  name: string;
  zh: string;
  region: string;
}
/** Pegada de um grupo de produtos; cada lista segue a ordem de `Footprint.provinces` (US$ mi). */
export interface FootprintSector {
  name: string;
  /** compras de SC registradas na província */
  purchases: number[];
  /** valor adicionado gerado na província, incluindo cadeias internas */
  va: number[];
  /** parte do valor adicionado gerada no próprio elo exportador */
  vaDirect: number[];
}
export interface Footprint {
  provinces: FootprintProvince[];
  /** o primeiro é o total ("Todos os produtos") */
  sectors: FootprintSector[];
  totals: {
    purchases: number;
    va: number;
    foreign: number;
    vaOutsideExporters: number;
    provincesOver100: number;
  };
}

interface ScChina {
  /** ano das seções insumo-produto (Alfândega da China) */
  year: number;
  /** ano das seções só com o Comex Stat (parceiros e exportações) */
  tradeYear: number;
  kpis: {
    importShare: number;
    exportShare: number;
    importsFromChina: number;
    exportsToChina: number;
    importGrowth: number;
    importRank: number;
    exportRank: number;
    /** participação de carnes e soja/grãos nas exportações para a China */
    meatSoyShare: number;
  };
  partnerShare: PartnerShare;
  exportSankey: Flow;
  footprint: Footprint;
  vaSankey: Flow;
  useSankey: Flow;
}

export const scChina = raw as ScChina;
