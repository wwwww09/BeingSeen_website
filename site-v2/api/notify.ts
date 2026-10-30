/**
 * Called by a Supabase Database Webhook on INSERT into public.stories.
 * It forwards a short notification to a Discord webhook.
 *
 * Required Vercel environment variables:
 *   MODERATION_WEBHOOK_SECRET
 *   DISCORD_WEBHOOK_URL
 *   SITE_URL (optional, defaults to the production URL)
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const secret = process.env.MODERATION_WEBHOOK_SECRET
  const discordUrl = process.env.DISCORD_WEBHOOK_URL
  if (!secret || !discordUrl) {
    res.status(500).json({ error: 'Notification environment is incomplete.' })
    return
  }

  if (req.headers['x-webhook-secret'] !== secret) {
    res.status(401).json({ error: 'Not allowed.' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = null
    }
  }

  const record = body?.record
  const story =
    typeof record?.story === 'string' ? record.story.trim().slice(0, 1500) : ''
  const starIndex =
    typeof record?.star_index === 'number' ? record.star_index : '?'
  const site = process.env.SITE_URL ?? 'https://being-seen-website-z59h.vercel.app'

  if (!story) {
    res.status(400).json({ error: 'No story in webhook payload.' })
    return
  }

  const content = [
    'A new star is awaiting moderation.',
    '',
    `"${story}"`,
    '',
    `Star #${starIndex}`,
    `Review: ${site}/admin/moderation`,
  ].join('\n')

  try {
    const response = await fetch(discordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        allowed_mentions: { parse: [] },
      }),
    })

    if (!response.ok) {
      console.error('Discord webhook failed', response.status, await response.text())
      res.status(502).json({ error: 'Discord webhook failed.' })
      return
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('notification error', error)
    res.status(500).json({ error: 'Notification failed.' })
  }
}
