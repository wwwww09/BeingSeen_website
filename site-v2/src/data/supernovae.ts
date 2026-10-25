/**
 * The five known lensed supernovae used by the Supernovae chapter.
 *
 * Source of truth: public/5_sne_data.json at the repository root. Vite's
 * build root is site-v2/, so the file is mirrored here as JSON to keep the
 * import inside the build root (an import reaching above the root survives
 * `vite build` but breaks the dev server's fs allow-list).
 *
 * Keep the two files identical if the numbers change.
 */
import rows from './supernovae.json'

export interface SneRow {
  name: string
  redshift: number
  /** Total lensing magnification μ. */
  magnification: number
  /** Apparent magnitude with no lens. */
  without_lens: number
  /** Apparent magnitude as observed through the lens. */
  with_lens: number
  /** Whether the lensed image clears the ZTF limit assumed by the brief. */
  detectable: boolean
}

export const supernovae = rows as SneRow[]

/** ZTF single-exposure detection limit used throughout the chapter. */
export const ZTF_LIMIT = 20.5
