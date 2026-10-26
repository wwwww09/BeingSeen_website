/**
 * The two GWTC-5.0 mass-gap candidates used in chapter 03.
 *
 * The corrected masses are the values obtained by removing the lensing
 * magnification. They are given here rather than derived, because the point of
 * the chapter is the hypothesis test, not a hidden re-analysis.
 */
export interface GwMassComponent {
  observed: number
  corrected: number
  mu: number
}

export interface GwEvent {
  id: string
  name: string
  m1: GwMassComponent
  m2: GwMassComponent
}

export const MASS_GAP = 45
export const GW_Y_MAX = 80

export const GW_EVENTS: GwEvent[] = [
  {
    id: 'gw241230',
    name: 'GW241230',
    m1: { observed: 68.0, corrected: 29.8, mu: 2.28 },
    m2: { observed: 49.0, corrected: 41.2, mu: 1.19 },
  },
  {
    id: 'gw241125',
    name: 'GW241125',
    m1: { observed: 60.0, corrected: 33.7, mu: 1.78 },
    m2: { observed: 47.0, corrected: 43.1, mu: 1.09 },
  },
]
