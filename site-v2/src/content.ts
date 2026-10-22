/**
 * The scroll chapters, mapped one-to-one onto the five parts of the brief:
 *
 *   hero        Home
 *   01          Lensing & Supernovae
 *   02          Lensing & Fast Radio Bursts
 *   03          Gravitational Wave Lensing
 *   04          Being Seen
 *
 * The four question titles and the key paragraphs below are the brief's copy.
 * The supporting prose around them is new, and the numbers and charts will be
 * generated from the raw catalogues in the next pass.
 */
export interface Chapter {
  id: string
  index: string
  kicker: string
  title: string
  body: string
  /** Optional build-status note shown under the paragraph. */
  note?: string
}

export const chapters: Chapter[] = [
  {
    id: 'supernovae',
    index: '01',
    kicker: 'Supernovae',
    title: 'Can Lensing Make Distant Supernovae Visible?',
    body:
      'Without gravitational lensing, none of the five known lensed supernovae in this sample could be detected by ZTF. With lensing, two became visible.',
  },
  {
    id: 'fast-radio-bursts',
    index: '02',
    kicker: 'Fast radio bursts',
    title: 'Can Lensing \u2018Copy\u2019 FRB Signals?',
    body:
      'When a fast radio burst passes near a massive galaxy, its path is bent. Some light takes a longer route, arriving later. We searched for such time-delayed pairs in the CHIME/FRB Catalog.',
  },
  {
    id: 'gravitational-waves',
    index: '03',
    kicker: 'Gravitational waves',
    title: 'Can GW Lensing Correct Black Hole Masses?',
    body:
      'Two events in GWTC-5.0 fall into the pair-instability mass gap — a range where stellar evolution theory says black holes should not exist. If their signals were magnified by lensing, their true masses would fall back into the normal range.',
  },
  {
    id: 'being-seen',
    index: '04',
    kicker: 'Being Seen',
    title: 'Being Seen',
    body:
      'Every dim star here represents an object in the universe that has not yet been fully seen. You can also leave an anonymous story — about a moment in your life when you felt unseen. Your story will not be tied to any identity; it will simply become the light of that star.',
    note: 'The star field and the story form arrive in the next pass.',
  },
]
