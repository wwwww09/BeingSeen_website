import { motion, type MotionValue } from 'framer-motion'
import { chapters } from '../content'

/**
 * A frameless top bar: wordmark, chapter numbers, and a hairline progress line.
 * No pills, no bar background, no boxes.
 */
export function Nav({ progress }: { progress: MotionValue<number> }) {
  return (
    <header className="nav">
      <a className="nav__mark" href="#main">
        Being Seen
      </a>

      <nav className="nav__links" aria-label="Chapters">
        {chapters.map((chapter) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            title={`${chapter.kicker} — chapter ${chapter.index}`}
            aria-label={`Chapter ${chapter.index}: ${chapter.kicker}`}
          >
            {chapter.index}
          </a>
        ))}
      </nav>

      <motion.div
        className="nav__progress"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />
    </header>
  )
}
