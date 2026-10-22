import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { home } from '../content'

export function HomePage() {
  const reduced = useReducedMotion() ?? false

  return (
    <section className="hero" data-side="left">
      <div className="hero__inner">
        <motion.p
          className="eyebrow"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {home.eyebrow}
        </motion.p>

        <motion.h1
          className="hero__title"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {home.title}
        </motion.h1>

        <motion.p
          className="hero__quote"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          &ldquo;{home.quote}&rdquo;
        </motion.p>

        <motion.p
          className="hero__lede"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {home.lede}
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link className="hero__enter" to="/science">
            Explore the Unseen <span aria-hidden="true">→</span>
          </Link>
          <Link className="hero__secondary" to="/message-board">
            Message Board
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
