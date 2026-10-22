import { motion, type MotionValue } from 'framer-motion'
import { Link, NavLink } from 'react-router-dom'

/**
 * Top-level hierarchy only:
 *
 *   Home · The Science · Message Board
 *
 * "The Science" stays active on all three sub-pages. The sub-navigation for
 * Supernovae / Fast radio bursts / Gravitational waves lives inside the
 * science layout, not here.
 */
export function Nav({ progress }: { progress: MotionValue<number> }) {
  return (
    <header className="nav">
      <Link className="nav__mark" to="/">
        Being Seen
      </Link>

      <nav className="nav__links" aria-label="Main">
        <NavLink to="/" end className="nav__link">
          Home
        </NavLink>
        <NavLink to="/science" className="nav__link" aria-label="The Science">
          <span className="nav__full">The Science</span>
          <span className="nav__short">Science</span>
        </NavLink>
        <NavLink
          to="/message-board"
          className="nav__link"
          aria-label="Message Board"
        >
          <span className="nav__full">Message Board</span>
          <span className="nav__short">Board</span>
        </NavLink>
      </nav>

      <motion.div
        className="nav__progress"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />
    </header>
  )
}
