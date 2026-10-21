import { motion, useSpring, type MotionValue } from 'framer-motion'

/**
 * The only chrome on the right edge: a hairline that fills as the story is
 * read. Desktop only — on a phone it would sit on top of the text.
 */
export function ProgressRail({ progress }: { progress: MotionValue<number> }) {
  const fill = useSpring(progress, { stiffness: 90, damping: 26, mass: 0.4 })

  return (
    <div className="rail" aria-hidden="true">
      <span className="rail__label">Progress</span>
      <div className="rail__track">
        <motion.div className="rail__fill" style={{ scaleY: fill }} />
      </div>
    </div>
  )
}
