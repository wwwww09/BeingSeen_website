/**
 * The site hierarchy and the brief's copy.
 *
 *   Home
 *   The Science
 *     ├── 01 Supernovae
 *     ├── 02 Fast radio bursts
 *     └── 03 Gravitational waves
 *   Message Board
 *
 * The question titles and the key paragraphs are the brief's copy. The
 * summaries, chart labels, and layout notes are new scaffolding for this pass.
 */
export interface ScienceChapter {
  slug: string
  index: string
  kicker: string
  title: string
  summary: string
  body: string
  chartLabel: string
  chartNote: string
}

export const home = {
  eyebrow: 'A serious game',
  title: 'Being Seen',
  quote:
    'The universe has its own telescope. We just need to learn how to look.',
  lede: 'This project explores how gravitational lensing — the bending of light by massive objects — helps us detect astronomical phenomena that would otherwise remain invisible. From supernovae to fast radio bursts to gravitational waves, we quantify how much the universe reveals when we let it do the work.',
}

export const science = {
  eyebrow: 'The Science',
  title: 'Three messages, one bend.',
  lede: 'A lens does not care what kind of light passes it. The same geometry acts on an exploding star, a radio burst, and a gravitational wave — but each messenger gives us a different measurement to repair. Three chapters, one question at a time.',
}

export const scienceChapters: ScienceChapter[] = [
  {
    slug: 'supernovae',
    index: '01',
    kicker: 'Supernovae',
    title: 'Can Lensing Make Distant Supernovae Visible?',
    summary:
      'A lens can make a faint explosion visible. The question is how many, and at what cost to the count.',
    body: 'Distant supernovae are our standard candles. But without a lens, they are too faint to see. If we miss them, our map of the cosmos is incomplete.',
    chartLabel: 'Brightness with and without lensing',
    chartNote:
      'The five known lensed supernovae, each as a pair: its brightness without a lens and with one. The chapter’s core number is the count that survives the detection limit.',
  },
  {
    slug: 'fast-radio-bursts',
    index: '02',
    kicker: 'Fast radio bursts',
    title: 'Can Lensing ‘Copy’ FRB Signals?',
    summary:
      'A lens can copy a burst in time. The question is whether any two arrivals in the catalogue are copies.',
    body: 'When an FRB signal passes near a massive galaxy, its path is bent. Some light takes a longer route, arriving later. We searched for such ‘time-delayed’ pairs in the CHIME/FRB Catalogue.',
    chartLabel: 'Time-delayed pairs in the CHIME/FRB catalogue',
    chartNote:
      'The search compares sky positions and dispersion measures. The chart and the result are the next pass.',
  },
  {
    slug: 'gravitational-waves',
    index: '03',
    kicker: 'Gravitational waves',
    title: 'Can GW Lensing Correct Black Hole Masses?',
    summary:
      'A lens can make a black hole look heavier. The question is how much magnification would be required.',
    body: 'Two events in the GWTC-5.0 catalogue fall into the ‘pair-instability mass gap’ — a range where stellar evolution theory says black holes should not exist. But if their signals were magnified by lensing, their true masses would fall back into the normal range.',
    chartLabel: 'Observed mass vs lens-corrected mass',
    chartNote:
      'The two candidates with error bars, before and after applying a common magnification. The correction is a hypothesis test, not a measurement.',
  },
]

export const messageBoard = {
  eyebrow: 'Message Board',
  title: 'Being Seen',
  body: 'Every dim star here represents an object in the universe that has not yet been fully seen. You can also leave an anonymous story — about a moment in your life when you felt unseen. Your story will not be tied to any identity; it will simply become the light of that star.',
  note: 'The star field and the story form arrive in the next pass.',
}
