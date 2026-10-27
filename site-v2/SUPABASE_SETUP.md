# Public Message Board — Supabase setup

The Message Board is now written for a shared Supabase board. Without the
two `VITE_SUPABASE_*` variables it falls back to the old browser-local board,
so local development still works. To make the board public, complete these
steps.

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard>.
2. Create a project (free tier is enough).
3. Wait for the database to finish provisioning.

## 2. Enable anonymous visitors

1. Open **Authentication → Sign In / Providers**.
2. Enable **Anonymous sign-ins**.
3. Save.

The app calls `signInAnonymously()` once per browser. No name, email, or
password is collected. The persisted anonymous user id is what allows a
visitor to delete their own story.

## 3. Create the table and policies

1. Open **SQL Editor**.
2. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Run it once.

This creates:

- `public.stories`, with one story per star (`star_index` is unique)
- public read access
- anonymous insert access, restricted to the current `auth.uid()`
- owner-only delete access
- a one-per-minute / ten-per-day rate limit per anonymous visitor
- Realtime publication for live updates

If Realtime is not active, open **Database → Replication** and add
`public.stories` to the `supabase_realtime` publication.

## 4. Copy the project credentials

In Supabase open **Project Settings → API** (or **API Keys**):

- Project URL
- Publishable key (or the legacy `anon` key)

These are safe to expose in a Vite frontend **only because RLS is enabled**.
Never use a `service_role` / secret key in this app.

## 5. Local environment

Create `site-v2/.env`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Or the legacy name:

```bash
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart `pnpm dev`. The footer should read:

```text
Stories are shared anonymously with everyone.
```

instead of `Local preview`.

## 6. Vercel environment

In Vercel → Project → **Settings → Environment Variables**, add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

to **Production**, **Preview**, and **Development**.

Then redeploy. Vite embeds these variables at build time, so an existing
deployment will not pick them up without a new build.

## 7. Verify the public board

1. Open the production URL, not a protected preview deployment:
   `https://being-seen-website-z59h.vercel.app/message-board`
2. Write a story and submit it.
3. Open the same URL in a private window or another browser.
4. The same amber star should appear there.
5. Delete it from the browser that created it; it should disappear
   everywhere via Realtime.
6. A different visitor should not see the delete button on someone else's
   story.

Deletion is tied to the browser's persistent anonymous session. Clearing
site data, switching browsers, or switching devices means the visitor can
no longer delete that story. You can always remove a row from the Supabase
**Table Editor** as the site owner.

## Moderation and safety

A public anonymous board needs active moderation. The database rate limits
reduce spam, but they do not remove harmful content. Use the Supabase
**Table Editor → stories** to remove inappropriate rows. Before public
launch, consider adding:

- a report button / `reports` table
- a visible crisis or moderation contact line
- a moderation policy and a person responsible for reviewing reports

## Notes

- Stories created before this change live in the old browser localStorage
  only. They are not migrated automatically.
- The board is capped at 10,000 stars; the `star_index` unique constraint
  makes a simultaneous claim on the same star fail cleanly.
- The publishable key is public by design. RLS, not secrecy, protects writes.
