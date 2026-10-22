import { Outlet } from 'react-router-dom'
import { ScienceNav } from '../components/ScienceNav'

/**
 * Layout for /science and its three child pages. The secondary navigation
 * exists only in this branch of the hierarchy.
 */
export function ScienceLayout() {
  return (
    <div className="science-shell">
      <ScienceNav />
      <Outlet />
    </div>
  )
}
