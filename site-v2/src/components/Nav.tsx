import { motion, type MotionValue } from 'framer-motion'
import { Link, NavLink, useLocation } from 'react-router-dom'

/**
 * The three top-level states of the project:
 *
 *   Being unseen · the science · Being seen
 */
export function Nav({ progress }: { progress: MotionValue<number> }) {
  const location = useLocation()

  // A NavLink to the route you are already on does not change the pathname,
  // so the shell's scroll reset never runs. Make that click return to the top.
  const scrollIfCurrent = (to: string) => {
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <header className="nav">
      <Link className="nav__mark" to="/" onClick={() => scrollIfCurrent('/')}>
        Being Seen
      </Link>

      <nav className="nav__links" aria-label="Main">
        <NavLink
          to="/"
          end
          className="nav__link"
          onClick={() => scrollIfCurrent('/')}
        >
          <span className="nav__full">Being unseen</span>
          <span className="nav__short">Unseen</span>
        </NavLink>
        <NavLink
          to="/science"
          className="nav__link"
          aria-label="the science"
          onClick={() => scrollIfCurrent('/science')}
        >
          <span className="nav__full">the science</span>
          <span className="nav__short">science</span>
        </NavLink>
        <NavLink
          to="/message-board"
          className="nav__link"
          aria-label="Being seen"
          onClick={() => scrollIfCurrent('/message-board')}
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
