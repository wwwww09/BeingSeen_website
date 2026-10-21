/**
 * Skeleton content.
 *
 * These are deliberately thin placeholders: the point of this pass is the shell
 * (fixed WebGL stage + scroll drive + motion), not the science writing. The real
 * chapters will replace this file once the shell is approved.
 */
export interface Chapter {
  id: string
  index: string
  kicker: string
  title: string
  body: string
}

export const chapters: Chapter[] = [
  {
    id: 'bend',
    index: '01',
    kicker: 'The bend',
    title: 'Gravity has no light of its own.',
    body:
      'It has geometry. When a beam of light passes close enough to a massive thing, the straight line it was travelling stops being straight. This chapter will show what that bend does to what we can see.',
  },
  {
    id: 'delay',
    index: '02',
    kicker: 'The delay',
    title: 'Two paths. One source.',
    body:
      'A bent beam can arrive by more than one road. The longer road is not brighter and it is not a different object; it is the same light, late. The gap between the arrivals is a measurable thing.',
  },
  {
    id: 'mass',
    index: '03',
    kicker: 'The mass',
    title: 'A lens edits the signal.',
    body:
      'Whatever a lens adds to a signal, it also adds to the number we infer from that signal. For a black-hole merger, that number is a mass. Take the lens away and the number changes.',
  },
  {
    id: 'witness',
    index: '04',
    kicker: 'The witness',
    title: 'The last chapter is a place.',
    body:
      'Not a chart. A field of unlit points, and a box for something you might want to leave there. That part comes after the shell, when the story has something to hand over.',
  },
]
