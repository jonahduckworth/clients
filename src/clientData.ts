export type BranchId = 'jd-builds' | 'ref-buddy' | 'harvestingpro' | 'league-hub';
export type NodeKind = 'root' | 'venture' | 'client';

export type Since =
  | { type: 'year'; year: number }
  | { type: 'date'; iso: `${number}-${number}-${number}` };

export interface GraphNode {
  id: string;
  kind: NodeKind;
  name: string;
  shortName: string;
  parentId?: string;
  branchId: BranchId;
  since?: Since;
  website?: string;
  logoSrc?: string;
  color: string;
  accent: string;
  sector: string;
  note: string;
}

export const DATA_REVIEWED_AT = '2026-05-11';

export const rootNode: GraphNode = {
  id: 'jd-builds',
  kind: 'root',
  name: 'JD Builds',
  shortName: 'JD',
  branchId: 'jd-builds',
  website: 'https://jdbuilds.ca',
  color: '#ffe073',
  accent: '#fff2b4',
  sector: 'Master company',
  note: 'The operating center for active products, direct builds, and client relationships.',
};

export const ventureNodes: GraphNode[] = [
  {
    id: 'ref-buddy',
    kind: 'venture',
    name: 'Ref Buddy',
    shortName: 'RB',
    parentId: 'jd-builds',
    branchId: 'ref-buddy',
    website: 'https://refbuddy.ca',
    color: '#f05a3c',
    accent: '#ffd3a8',
    sector: 'Officiating infrastructure',
    note: 'Scheduling, assigning, communication, expenses, and league operations for officials.',
  },
  {
    id: 'harvestingpro',
    kind: 'venture',
    name: 'HarvestingPro',
    shortName: 'HP',
    parentId: 'jd-builds',
    branchId: 'harvestingpro',
    website: 'https://harvestingpro.com',
    logoSrc: '/logos/harvestingpro-mobile-icon.png',
    color: '#58d654',
    accent: '#dfffb2',
    sector: 'Forestry operations',
    note: 'Operational software for contractors, woodlots, crews, equipment, and profitability.',
  },
  {
    id: 'league-hub',
    kind: 'venture',
    name: 'League Hub',
    shortName: 'LH',
    parentId: 'jd-builds',
    branchId: 'league-hub',
    color: '#54b7f7',
    accent: '#d7f2ff',
    sector: 'League systems',
    note: 'A focused branch for league-grade hockey administration and connected products.',
  },
];

export const clientNodes: GraphNode[] = [
  {
    id: 'bchl',
    kind: 'client',
    name: 'British Columbia Hockey League',
    shortName: 'BCHL',
    parentId: 'ref-buddy',
    branchId: 'ref-buddy',
    since: { type: 'year', year: 2023 },
    website: 'https://bchl.ca',
    color: '#f05a3c',
    accent: '#ffd3a8',
    sector: 'Junior hockey league',
    note: 'Long-running Ref Buddy league relationship.',
  },
  {
    id: 'somha',
    kind: 'client',
    name: 'South Okanagan Minor Hockey Association',
    shortName: 'SOMHA',
    parentId: 'ref-buddy',
    branchId: 'ref-buddy',
    since: { type: 'year', year: 2023 },
    website: 'https://somha.com',
    logoSrc: '/logos/somha.png',
    color: '#ff774f',
    accent: '#ffd3a8',
    sector: 'Minor hockey association',
    note: 'Active Ref Buddy client in the hockey association branch.',
  },
  {
    id: 'vijhl',
    kind: 'client',
    name: 'Vancouver Island Junior Hockey League',
    shortName: 'VIJHL',
    parentId: 'ref-buddy',
    branchId: 'ref-buddy',
    since: { type: 'year', year: 2024 },
    website: 'https://www.vijhl.com',
    color: '#ff9f45',
    accent: '#ffd3a8',
    sector: 'Junior hockey league',
    note: 'Active Ref Buddy league relationship.',
  },
  {
    id: 'wijhl',
    kind: 'client',
    name: 'Western International Junior Hockey League',
    shortName: 'WIJHL',
    parentId: 'ref-buddy',
    branchId: 'ref-buddy',
    since: { type: 'year', year: 2026 },
    website: 'https://www.wijhl.com',
    color: '#ffc55a',
    accent: '#fff0c4',
    sector: 'Junior hockey league',
    note: 'Newest Ref Buddy league branch.',
  },
  {
    id: 'nlbha',
    kind: 'client',
    name: 'Newfoundland and Labrador Ball Hockey Association',
    shortName: 'NLBHA',
    parentId: 'ref-buddy',
    branchId: 'ref-buddy',
    since: { type: 'year', year: 2026 },
    website: 'https://ballhockeynl.ca',
    color: '#ffd76a',
    accent: '#fff0c4',
    sector: 'Ball hockey association',
    note: 'Eastern Canada ball hockey client for Ref Buddy.',
  },
  {
    id: 'j-bueckert',
    kind: 'client',
    name: 'J. Bueckert Logging Ltd.',
    shortName: 'Bueckert',
    parentId: 'harvestingpro',
    branchId: 'harvestingpro',
    since: { type: 'date', iso: '2025-05-26' },
    color: '#58d654',
    accent: '#dfffb2',
    sector: 'Logging contractor',
    note: 'Active HarvestingPro subscription.',
  },
  {
    id: 'bill-todd',
    kind: 'client',
    name: 'Bill Todd Ltd.',
    shortName: 'Bill Todd',
    parentId: 'harvestingpro',
    branchId: 'harvestingpro',
    since: { type: 'date', iso: '2025-05-27' },
    color: '#74e06a',
    accent: '#e6ffbd',
    sector: 'Forestry contractor',
    note: 'Active HarvestingPro subscription.',
  },
  {
    id: 'bc-eco',
    kind: 'client',
    name: 'BC Eco Industrial Services Ltd.',
    shortName: 'BC Eco',
    parentId: 'harvestingpro',
    branchId: 'harvestingpro',
    since: { type: 'date', iso: '2025-05-27' },
    website: 'https://bceco.ca',
    color: '#8ee86e',
    accent: '#e6ffbd',
    sector: 'Industrial services',
    note: 'Active HarvestingPro subscription.',
  },
  {
    id: 'mercer-forestry',
    kind: 'client',
    name: 'Mercer Forestry Services Ltd.',
    shortName: 'Mercer',
    parentId: 'harvestingpro',
    branchId: 'harvestingpro',
    since: { type: 'date', iso: '2025-05-30' },
    website: 'https://mercerint.com/our-operations/mercer-forestry-services/',
    color: '#a7ef78',
    accent: '#efffc8',
    sector: 'Forestry services',
    note: 'Active HarvestingPro subscription.',
  },
  {
    id: 'jordco',
    kind: 'client',
    name: 'Jordco Enterprises Ltd.',
    shortName: 'Jordco',
    parentId: 'harvestingpro',
    branchId: 'harvestingpro',
    since: { type: 'date', iso: '2025-06-03' },
    color: '#c0f58b',
    accent: '#efffc8',
    sector: 'Logging contractor',
    note: 'Active HarvestingPro subscription.',
  },
  {
    id: 'wadlegger',
    kind: 'client',
    name: 'Wadlegger Logging & Construction Ltd.',
    shortName: 'Wadlegger',
    parentId: 'harvestingpro',
    branchId: 'harvestingpro',
    since: { type: 'date', iso: '2025-07-03' },
    color: '#dcf7a9',
    accent: '#f5ffd9',
    sector: 'Logging and construction',
    note: 'Active HarvestingPro subscription.',
  },
  {
    id: 'jphl',
    kind: 'client',
    name: 'Junior Prospects Hockey League',
    shortName: 'JPHL',
    parentId: 'league-hub',
    branchId: 'league-hub',
    since: { type: 'year', year: 2026 },
    website: 'https://juniorprospectshockeyleague.com',
    color: '#54b7f7',
    accent: '#d7f2ff',
    sector: 'Junior hockey league',
    note: 'League Hub launch client.',
  },
  {
    id: 'munden',
    kind: 'client',
    name: 'Munden Truck & Equipment Ltd.',
    shortName: 'Munden',
    parentId: 'jd-builds',
    branchId: 'jd-builds',
    since: { type: 'year', year: 2025 },
    website: 'https://mundengroup.ca',
    color: '#e8a33d',
    accent: '#ffefb8',
    sector: 'Truck and equipment services',
    note: 'Direct JD Builds client for active build work.',
  },
];

export const graphNodes = [rootNode, ...ventureNodes, ...clientNodes];

export const branchLabels: Record<BranchId | 'all', string> = {
  all: 'All',
  'jd-builds': 'JD Builds',
  'ref-buddy': 'Ref Buddy',
  harvestingpro: 'HarvestingPro',
  'league-hub': 'League Hub',
};

export function getParent(node: GraphNode): GraphNode | undefined {
  return graphNodes.find((candidate) => candidate.id === node.parentId);
}

export function getBranchNodes(branchId: BranchId): GraphNode[] {
  if (branchId === 'jd-builds') {
    return clientNodes.filter((node) => node.branchId === 'jd-builds');
  }

  return clientNodes.filter((node) => node.branchId === branchId);
}
