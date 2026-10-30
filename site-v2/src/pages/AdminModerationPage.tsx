import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const SESSION_KEY = 'being-seen:moderation-password'

interface PendingStory {
  id: string
  star_index: number
  story: string
  created_at: string
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function AdminModerationPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [stories, setStories] = useState<PendingStory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async (candidate: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/stories', {
        headers: { 'x-admin-password': candidate },
        cache: 'no-store',
      })

      if (response.status === 401) {
        sessionStorage.removeItem(SESSION_KEY)
        setAuthed(false)
        setStories([])
        setError('That password was not accepted.')
        return
      }

      const body = (await response.json()) as {
        stories?: PendingStory[]
        error?: string
      }

      if (!response.ok) {
        throw new Error(body.error ?? 'The moderation queue could not be read.')
      }

      sessionStorage.setItem(SESSION_KEY, candidate)
      setPassword(candidate)
      setAuthed(true)
      setStories(body.stories ?? [])
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'The moderation queue could not be read.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) void load(saved)
  }, [])

  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    if (!password.trim()) return
    void load(password.trim())
  }

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    setError(null)

    try {
      const response = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ id, action }),
      })

      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(body.error ?? 'The action failed.')
      }

      setStories((current) => current.filter((story) => story.id !== id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The action failed.')
    } finally {
      setBusyId(null)
    }
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
    setPassword('')
    setStories([])
    setError(null)
  }

  if (!authed) {
    return (
      <main className="admin-page">
        <div className="admin-card">
          <p className="admin-kicker">Private console</p>
          <h1 className="admin-title">Moderation</h1>
          <p className="admin-note">
            New stars wait here until they are approved.
          </p>

          <form className="admin-login" onSubmit={submitPassword}>
            <label className="admin-label" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              className="admin-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
            <button className="admin-button" type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>

          {error ? <p className="admin-error">{error}</p> : null}

          <Link className="admin-back" to="/">
            ← Back to Being Seen
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-head">
          <div>
            <p className="admin-kicker">Private console</p>
            <h1 className="admin-title">Moderation</h1>
          </div>
          <button className="admin-quiet" type="button" onClick={logout}>
            Sign out
          </button>
        </header>

        <p className="admin-note">
          {stories.length === 0
            ? 'No stars are waiting for review.'
            : `${stories.length} star${stories.length === 1 ? '' : 's'} awaiting review.`}
        </p>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-list">
          {stories.map((story) => (
            <article className="admin-story" key={story.id}>
              <p className="admin-story__meta">
                Star #{story.star_index} · {formatDate(story.created_at)}
              </p>
              <p className="admin-story__text">{story.story}</p>
              <div className="admin-actions">
                <button
                  className="admin-approve"
                  type="button"
                  disabled={busyId === story.id}
                  onClick={() => void act(story.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  className="admin-reject"
                  type="button"
                  disabled={busyId === story.id}
                  onClick={() => void act(story.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer className="admin-foot">
          <button
            className="admin-quiet"
            type="button"
            onClick={() => void load(password)}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link className="admin-back" to="/">
            ← Back to Being Seen
          </Link>
        </footer>
      </div>
    </main>
  )
}
