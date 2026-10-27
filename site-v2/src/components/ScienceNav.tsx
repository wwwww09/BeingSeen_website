import { NavLink, useLocation } from 'react-router-dom'
import { scienceChapters } from '../content'

/**
 * Secondary navigation, only inside "The Science". It never appears on Home
 * or the Message Board, so the top-level hierarchy stays three items.
 */
export function ScienceNav() {
  const location = useLocation()

  const scrollIfCurrent = (to: string) => {
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav className="science-nav" aria-label="The Science chapters">
      <span className="science-nav__label">Chapters</span>
      <div className="science-nav__links">
        <NavLink
          to="/science"
          end
          className="science-nav__link"
          onClick={() => scrollIfCurrent('/science')}
        >
          Overview
        </NavLink>
        {scienceChapters.map((chapter) => {
          const to = `/science/${chapter.slug}`
          return (
            <NavLink
              key={chapter.slug}
              to={to}
              className="science-nav__link"
              onClick={() => scrollIfCurrent(to)}
            >
              <span className="science-nav__index">{chapter.index}</span>{' '}
              {chapter.kicker}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
