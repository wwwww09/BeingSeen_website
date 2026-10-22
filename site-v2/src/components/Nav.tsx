import { motion, type MotionValue } from 'framer-motion'
import { Link, NavLink } from 'react-router-dom'

/**
 * The three top-level states of the project:
 *
 *   Being unseen · the science · Being seen
 */
export function Nav({ progress }: { progress: MotionValue<number> }) {
  return (
    <header className="nav">
      <Link className="nav__mark" to="/">
        Being Seen
      </Link>

      <nav className="nav__links" aria-label="Main">
        <NavLink to="/" end className="nav__link">
          <span className="nav__full">Being unseen</span>
          <span className="nav__short">Unseen</span>
        </NavLink>
        <NavLink to="/science" className="nav__link" aria-label="the science">
          <span className="nav__full">the science</span>
          <span className="nav__short">science</span>
        </NavLink>
        <NavLink
          to="/message-board"
          className="nav__link"
          aria-label="Being seen"
        >
          <span className="nav__full">Being seen</span>
          <span className="nav__short">Seen</span>
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
