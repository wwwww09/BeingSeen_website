import { NavLink } from 'react-router-dom'
import { scienceChapters } from '../content'

/**
 * Secondary navigation, only inside "The Science". It never appears on Home
 * or the Message Board, so the top-level hierarchy stays three items.
 */
export function ScienceNav() {
  return (
    <nav className="science-nav" aria-label="The Science chapters">
      <span className="science-nav__label">Chapters</span>
      <div className="science-nav__links">
        <NavLink to="/science" end className="science-nav__link">
          Overview
        </NavLink>
        {scienceChapters.map((chapter) => (
          <NavLink
            key={chapter.slug}
            to={`/science/${chapter.slug}`}
            className="science-nav__link"
          >
            <span className="science-nav__index">{chapter.index}</span>{' '}
            {chapter.kicker}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
