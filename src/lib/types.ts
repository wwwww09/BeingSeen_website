/**
 * 数据类型定义 —— 与 build_data.py 的输出 JSON 严格对应。
 * 修改管线时务必同步这里。
 */

// ---------------------------------------------------------------- 超新星
export interface SupernovaEvent {
  name: string
  redshift: number
  magnification: number
  timeDelayDays: number | null
  reference: string
  ra: number
  dec: number
  magNoLens: number
  magLensed: number
  detectedNoLens: boolean
  detectedLensed: boolean
}

export interface SupernovaeData {
  limitingMag: number
  absoluteMagB: number
  sampleSize: number
  detectedNoLens: number
  detectedLensed: number
  events: SupernovaEvent[]
}

export interface Histogram {
  counts: number[]
  edges: number[]
}

export interface ScatterPoint {
  sourceRedshift: number
  lensRedshift: number
  mag: number
  mu: number | null
  detected: boolean
}

export interface MockSupernovaeData {
  totalRows: number
  detectedByZTF: number
  limitingMag: number
  brightestTotalMag: number
  brightestImageMag: number
  medianImageMag: number
  provenance: string
  redshiftDistribution: { all: Histogram; detected: Histogram }
  lensRedshiftDistribution: { all: Histogram; detected: Histogram }
  magnitudeDistribution: Histogram
  magnitudeDistributionTotal: Histogram
  magnificationDistribution: Histogram
  scatterSample: ScatterPoint[]
  stats: {
    snTypeCounts: Record<string, number>
    vDispMedian: number
    imageSepMedian: number
    imageNumberCounts: Record<string, number>
    muTotalMedian: number
    timeDelayMedianAbsDays: number
  }
}

// ---------------------------------------------------------------- FRB
export interface FrbEvent {
  name: string
  ra: number
  dec: number
  dm: number
  snr: number | null
  isRepeater: boolean
}

export interface FrbPair {
  frb1: string
  frb2: string
  sepDeg: number
  dm1: number
  dm2: number
  dmDiff: number
  dmRatio: number | null
  snr1: number | null
  snr2: number | null
  timeDelayDays: number | null
  ra1: number
  dec1: number
  ra2: number
  dec2: number
}

export interface FrbClaimedPair {
  frb1: string
  frb2: string
  sepDeg: number
  dm1: number
  dm2: number
  dmDiff: number
  dmRatio: number | null
  timeDelayDays: number | null
  passesDmTest: boolean
}

export interface FrbFunnelStage {
  label: string
  criteria: string
  count: number
}

export interface FrbSearch {
  poolSize: number
  maxSepDeg: number
  totalPairsWithinMaxSep: number
  funnel: FrbFunnelStage[]
  survivors: FrbPair[]
  survivorCount: number
  bestByDmAgreement: FrbPair[]
  bestBySeparation: FrbPair[]
  claimedPairs: FrbClaimedPair[]
  dmToleranceNote: string
}

export interface FrbsData {
  catalogTotal: number
  uniqueCount: number
  rawRowCount: number
  repeaterCount: number
  nonRepeaterCount: number
  search: FrbSearch
  reliableCandidateCount: number
  events: FrbEvent[]
}

// ---------------------------------------------------------------- 引力波
export interface GwCandidate {
  name: string
  m1Obs: number
  m2Obs: number
  m1Corr: number
  m2Corr: number
  m1ObsRange: [number, number]
  m1CorrRange: [number, number]
  m2ObsRange: [number, number]
  m2CorrRange: [number, number]
  sqrtMu: number
  mu: number
  luminosityDistance: number
  luminosityDistanceRange: [number, number]
  snr: number
  redshift: number
  pAstro: number | null
  far: number | null
  interpretation: string
}

export interface GwEventBrief {
  name: string
  m1: number
  m2: number
  distance: number
  snr: number
}

export interface GravitationalWavesData {
  catalogName: string
  catalogTotal: number
  gapLowerBound: number
  candidateCount: number
  candidates: GwCandidate[]
  allEvents: GwEventBrief[]
}

// ---------------------------------------------------------------- 透镜
export interface LensPoint {
  ra: number
  dec: number
  z: number | null
}

export interface LensesData {
  total: number
  withRedshift: number
  sample: LensPoint[]
  redshiftHistogram: Histogram
  types: Record<string, number>
}

// ---------------------------------------------------------------- 留言板
export interface Story {
  id: number
  body: string
  created_at: string
}
