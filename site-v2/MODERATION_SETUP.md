# Moderation flow — setup

The public Message Board already uses Supabase, so moderation stays on the
same database. Vercel Serverless Functions are only used for the protected
admin queue and the Discord notification. No second data store is needed.

## Data flow

```text
Visitor
  └─ Submit to the Universe
       └─ INSERT into Supabase stories (status = 'pending')
            ├─ RLS: only this anonymous owner can see it while pending
            ├─ Supabase Database Webhook → /api/notify → Discord
            └─ Visitor sees a dim amber ember, not a lit star

Admin
  └─ /admin/moderation + ADMIN_PASSWORD
       └─ GET /api/admin/stories (service role, pending only)
            ├─ Approve → status = 'approved'
            │    └─ Realtime refresh → everyone sees the amber star
            └─ Reject  → row deleted → star is free again
```

## 1. Run the SQL

In Supabase → SQL Editor, run:

```text
supabase/moderation.sql
```

It preserves all existing stories as approved, adds `status`, and changes RLS
so pending stories are visible only to their author.

## 2. Apply the same migration to local/production

There is nothing to migrate locally; the frontend treats a missing `status`
as approved, so deploying the UI before the SQL is safe. New rows only become
pending after the SQL is applied.

## 3. Vercel environment variables

Add these server-only variables in Vercel → Project → Settings →
Environment Variables. Do **not** prefix them with `VITE_`.

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
DISCORD_WEBHOOK_URL
MODERATION_WEBHOOK_SECRET
SITE_URL
```

- `SUPABASE_SERVICE_ROLE_KEY` is secret; never put it in client code.
- `ADMIN_PASSWORD` is the password for `/admin/moderation`; use a long value,
  not the example `beingseen2024`.
- `SITE_URL` is optional and defaults to
  `https://being-seen-website-z59h.vercel.app`.
- Redeploy after adding/changing variables.

## 4. Discord notification

1. Create a Discord server/channel (private is fine).
2. Channel → Edit Channel → Integrations → Webhooks → New Webhook.
3. Copy the webhook URL into `DISCORD_WEBHOOK_URL`.
4. Generate a random string for `MODERATION_WEBHOOK_SECRET`.
5. In Supabase → Database → Webhooks → Create a new hook:
   - Table: `public.stories`
   - Events: `INSERT`
   - Type: HTTP Request
   - Method: `POST`
   - URL: `https://being-seen-website-z59h.vercel.app/api/notify`
   - Header: `x-webhook-secret: <MODERATION_WEBHOOK_SECRET>`
6. Submit a test story. A Discord message should arrive.

If the Vercel API returns 401, the webhook header does not match the env var.

## 5. Admin console

Open:

```text
https://being-seen-website-z59h.vercel.app/admin/moderation
```

Enter `ADMIN_PASSWORD`. The page stores it in `sessionStorage` for the tab;
closing the tab signs you out.

- **Approve** → story becomes public and the star turns amber.
- **Reject** → row is deleted and the star is free.

The admin API is protected by the password header; the page itself is not
linked anywhere in the site.

## 6. Local development

Vite alone does not serve `/api`. Use `vercel dev` from `site-v2/` if you want
to exercise the admin API locally. The public Message Board itself still works
with `pnpm dev`.

## Notes

- Pending stories block their star until approved or rejected.
- A rejected story is deleted, so the star can be used again.
- The author can delete their own pending story from the read modal.
- Rate limits from `schema.sql` still apply.
- This is a small moderation system, not a full review queue with audit logs.
  Add a `reports` table or an audit log if the board grows.
