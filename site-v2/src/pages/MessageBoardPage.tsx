import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { messageBoard } from '../content'

export function MessageBoardPage() {
  const reduced = useReducedMotion() ?? false

  return (
    <>
      <section className="page-head page-head--left" data-side="left">
        <div className="page-head__inner">
          <p className="eyebrow">{messageBoard.eyebrow}</p>
          <motion.h1
            className="page-title"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {messageBoard.title}
          </motion.h1>
          <span className="chapter__rule" aria-hidden="true" />
          <p className="page-lede">{messageBoard.body}</p>
          <p className="page-note">{messageBoard.note}</p>
        </div>
      </section>

      {/*
        The star field is deliberately a reserved frame for now. It is not a
        canvas and not a fake star map: the label says what will occupy it.
      */}
      <section className="board-field" data-side="left">
        <div className="board-field__inner">
          <span className="board-field__label">Star field</span>
          <p className="board-field__note">
            The 3D field of unlit stars arrives in the next pass.
          </p>
        </div>
      </section>

      <section className="board-workspace" data-side="left">
        <div className="board-grid">
          <div className="board-form">
            <p className="section-kicker">Leave a story</p>
            <h2 className="board-title">Your story</h2>
            <label className="board-label" htmlFor="story">
              Anonymous
            </label>
            <textarea
              id="story"
              className="board-textarea"
              rows={6}
              placeholder="A moment when you felt unseen…"
              disabled
            />
            <div className="board-form__foot">
              <span className="small">600 characters</span>
              <button className="board-submit" type="button" disabled>
                Light this star
              </button>
            </div>
            <p className="page-note">
              The form connects to Supabase in the next pass.
            </p>
          </div>

          <div className="board-stories">
            <p className="section-kicker">Stories</p>
            <h2 className="board-title">Nothing here yet</h2>
            <p className="page-note">
              The list will read from Supabase in the next pass.
            </p>
          </div>
        </div>

        <div className="board-back">
          <Link className="back-link" to="/science">
            ← Back to The Science
          </Link>
          <Link className="back-link" to="/">
            Home
          </Link>
        </div>
      </section>
    </>
  )
}
