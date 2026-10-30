import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MessageStarMap } from '../components/MessageStarMap'
import {
  MAX_STORY_LENGTH,
  STAR_COUNT,
  STARS,
  createStoryId,
  readStories,
  saveStories,
  type StoryRecord,
} from '../lib/messageBoard'
import {
  createPublicStory,
  deletePublicStory,
  ensureAnonymousUser,
  fetchPublicStories,
  isPublicBoard,
  storyErrorMessage,
  subscribeToPublicStories,
} from '../lib/publicStories'

const CTA_ONE =
  'Gravitational lensing magnifies the faint light of distant stars. Here, your empathy is the lens. By sharing your story, you light up a star that was once lost in the dark.'

const CTA_TWO =
  'We’ve built an anonymous message board. Pick a dark, unobserved star on our map, and leave a story of a time you felt unseen. When you submit it, the star will light up. Let the universe hold the things we couldn’t see.'

function formatDate(value: number) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

export function MessageBoardPage() {
  const reduced = useReducedMotion() ?? false
  const [stories, setStories] = useState<StoryRecord[]>(() =>
    isPublicBoard ? [] : readStories(),
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isPublicBoard)
  const [isSaving, setIsSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const selectedStory =
    selected === null
      ? null
      : stories.find((story) => story.index === selected) ?? null

  const canDelete = Boolean(
    selectedStory &&
      (!isPublicBoard ||
        (userId !== null && selectedStory.ownerId === userId)),
  )

  const approvedCount = stories.filter(
    (story) => story.status !== 'pending' && story.status !== 'rejected',
  ).length

  const closeModal = useCallback(() => {
    setSelected(null)
    setDraft('')
    setSubmitted(false)
    setNotice(null)
  }, [])

  useEffect(() => {
    if (!isPublicBoard) return

    let active = true
    let refreshTimer: number | undefined

    const refresh = async () => {
      try {
        const next = await fetchPublicStories()
        if (!active) return
        setStories(next)
        setLoadError(null)
      } catch (error) {
        if (!active) return
        setLoadError(
          storyErrorMessage(error, 'The public sky could not be reached.'),
        )
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const boot = async () => {
      // Reading the board is public. Never let a slow anonymous-auth request
      // hide existing stories behind a loading state.
      void ensureAnonymousUser()
        .then((id) => {
          if (active) {
            setUserId(id)
            // Once the anonymous identity exists, fetch again so the
            // owner can also see their own pending story under RLS.
            void refresh()
          }
        })
        .catch((error) => {
          if (active) {
            setLoadError(
              storyErrorMessage(
                error,
                'Anonymous sessions are unavailable right now.',
              ),
            )
          }
        })

      await refresh()
    }

    void boot()

    const unsubscribe = subscribeToPublicStories(() => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        void refresh()
      }, 300)
    })

    return () => {
      active = false
      window.clearTimeout(refreshTimer)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (selected === null) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selected, closeModal])

  const openStar = (index: number) => {
    setDraft('')
    setSubmitted(false)
    setNotice(null)
    setSelected(index)
  }

  const submitStory = async () => {
    if (selected === null || isSaving) return
    const text = draft.trim().slice(0, MAX_STORY_LENGTH)
    if (!text) return

    const star = STARS[selected]
    if (!star) return

    setNotice(null)
    setIsSaving(true)

    try {
      if (isPublicBoard) {
        const story = await createPublicStory({
          index: selected,
          x: star.x,
          y: star.y,
          story: text,
        })
        setStories((previous) => [
          story,
          ...previous.filter((entry) => entry.index !== story.index),
        ])
        setSubmitted(true)
      } else {
        const story: StoryRecord = {
          id: createStoryId(),
          index: selected,
          x: star.x,
          y: star.y,
          story: text,
          createdAt: Date.now(),
        }
        const next = [
          ...stories.filter((entry) => entry.index !== selected),
          story,
        ]
        saveStories(next)
        setStories(next)
        closeModal()
      }
    } catch (error) {
      setNotice(
        storyErrorMessage(error, 'The story could not be sent. Try again.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteStory = async () => {
    if (!selectedStory || isSaving) return
    if (isPublicBoard && selectedStory.ownerId !== userId) return

    setNotice(null)
    setIsSaving(true)

    try {
      if (isPublicBoard) {
        await deletePublicStory(selectedStory.id)
      } else {
        const next = stories.filter(
          (story) => story.index !== selectedStory.index,
        )
        saveStories(next)
      }
      setStories((previous) =>
        previous.filter((story) => story.index !== selectedStory.index),
      )
      closeModal()
    } catch (error) {
      setNotice(
        storyErrorMessage(error, 'This star could not be deleted. Try again.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const footNote = isLoading
    ? 'Listening to the dark…'
    : loadError ??
      (isPublicBoard
        ? 'Stories are shared anonymously with everyone. Please leave out names and private details.'
        : 'Local preview — stories are stored only in this browser.')

  return (
    <article className="message-page">
      <section className="message-hero">
        <div className="message-hero__inner">
          <p className="eyebrow">The last chapter</p>
          <motion.h1
            className="message-title"
            initial={reduced ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            THE MESSAGE BOARD
          </motion.h1>
          <span className="chapter__rule" aria-hidden="true" />
          <p className="message-lede">{CTA_ONE}</p>
          <p className="message-lede">{CTA_TWO}</p>
        </div>
      </section>

      <section
        className="message-map"
        aria-label="Anonymous star message board"
      >
        <MessageStarMap
          stories={stories}
          paused={selected !== null}
          reduced={reduced}
          onSelect={openStar}
        />

        <div className="message-map__hud" aria-hidden="true">
          <span className="message-map__hud-item message-map__hud-item--tl">
            {STAR_COUNT.toLocaleString('en-US')} UNOBSERVED STARS
          </span>
          <span className="message-map__hud-item message-map__hud-item--tr">
            {approvedCount} LIT
          </span>
          <span className="message-map__hud-item message-map__hud-item--bl">
            ZTF / DARK SKY
          </span>
          <span className="message-map__hud-item message-map__hud-item--br">
            CLICK A STAR
          </span>
        </div>

        <p className="message-map__hint">
          Hover a dark star · Click to leave a story
        </p>
      </section>

      <footer className="message-foot">
        <p
          className={`message-foot__note${
            loadError ? ' message-foot__note--error' : ''
          }`}
          role="status"
        >
          {footNote}
        </p>
        <div className="message-foot__links">
          <Link className="back-link" to="/science">
            ← Back to The Science
          </Link>
          <Link className="back-link" to="/">
            Home
          </Link>
        </div>
      </footer>

      {selected !== null ? (
        <div
          className="message-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div
            className="message-modal__panel"
            data-lit={selectedStory && !submitted ? 'true' : 'false'}
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              submitted
                ? 'message-modal-confirmation'
                : selectedStory
                  ? 'message-modal-kicker'
                  : 'message-modal-title'
            }
          >
            <button
              className="message-modal__close"
              type="button"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>

            {notice ? (
              <p className="message-modal__error" role="alert">
                {notice}
              </p>
            ) : null}

            {submitted ? (
              <>
                <p className="message-modal__kicker">A signal received</p>
                <h2
                  className="message-modal__title"
                  id="message-modal-confirmation"
                >
                  Your message has been sent into the cosmos.
                </h2>
                <p className="message-modal__note">
                  It is awaiting a final orbit to light up.
                </p>
                <div className="message-modal__actions">
                  <button
                    className="message-modal__submit"
                    type="button"
                    onClick={closeModal}
                  >
                    Return to the stars
                  </button>
                </div>
              </>
            ) : selectedStory ? (
              <>
                <p
                  className="message-modal__kicker"
                  id="message-modal-kicker"
                >
                  {selectedStory.status === 'pending'
                    ? 'A star awaiting its final orbit'
                    : 'A story from the dark'}
                </p>
                <p className="message-modal__story">
                  {selectedStory.story}
                </p>
                <p className="message-modal__meta">
                  Left on {formatDate(selectedStory.createdAt)}
                  {selectedStory.status === 'pending'
                    ? ' · Awaiting moderation'
                    : ''}
                </p>
                <div className="message-modal__actions">
                  {canDelete ? (
                    <button
                      className="message-modal__delete"
                      type="button"
                      onClick={deleteStory}
                      disabled={isSaving}
                      title="This cannot be undone."
                      aria-label="Delete this star permanently"
                    >
                      {isSaving ? 'Deleting…' : 'Delete this star'}
                    </button>
                  ) : null}
                  <button
                    className="message-modal__submit"
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="message-modal__kicker">An unobserved star</p>
                <h2
                  className="message-modal__title"
                  id="message-modal-title"
                >
                  Write down a moment you felt invisible.
                </h2>
                <p className="message-modal__note">
                  {isPublicBoard
                    ? '(Your name will remain anonymous. Your story will be visible to everyone.)'
                    : '(Your name will remain anonymous. Stored only in this browser.)'}
                </p>
                <textarea
                  className="message-modal__textarea"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={MAX_STORY_LENGTH}
                  placeholder="A moment when you felt unseen…"
                  aria-label="Write down a moment you felt invisible. Your name will remain anonymous."
                  autoFocus
                />
                <div className="message-modal__foot">
                  <span className="message-modal__count">
                    {draft.length}/{MAX_STORY_LENGTH}
                  </span>
                  <button
                    className="message-modal__submit"
                    type="button"
                    onClick={submitStory}
                    disabled={!draft.trim() || isSaving}
                  >
                    {isSaving ? 'Sending…' : 'Submit to the Universe'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  )
}
