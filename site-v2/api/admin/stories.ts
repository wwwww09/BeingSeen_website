import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function passwordMatches(value: unknown) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof value !== 'string') return false

  const given = Buffer.from(value)
  const wanted = Buffer.from(expected)
  return given.length === wanted.length && timingSafeEqual(given, wanted)
}

function readPassword(req: any) {
  const value = req.headers['x-admin-password']
  return Array.isArray(value) ? value[0] : value
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Supabase admin credentials are not set.' })
    return
  }

  if (!passwordMatches(readPassword(req))) {
    res.status(401).json({ error: 'Not allowed.' })
    return
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('stories')
        .select('id, star_index, story, owner_id, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error
      res.status(200).json({ stories: data ?? [] })
      return
    }

    if (req.method === 'POST') {
      let body = req.body
      if (typeof body === 'string') body = JSON.parse(body)

      const id = typeof body?.id === 'string' ? body.id : ''
      const action = body?.action

      if (!id || !['approve', 'reject'].includes(action)) {
        res.status(400).json({ error: 'Expected id and action.' })
        return
      }

      if (action === 'approve') {
        const { data, error } = await supabase
          .from('stories')
          .update({ status: 'approved' })
          .eq('id', id)
          .eq('status', 'pending')
          .select('id')
        if (error) throw error
        if (!data?.length) {
          res.status(404).json({ error: 'Story is no longer pending.' })
          return
        }
        res.status(200).json({ ok: true })
        return
      }

      // Reject removes the row so the star becomes available again.
      const { data, error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id)
        .eq('status', 'pending')
        .select('id')
      if (error) throw error
      if (!data?.length) {
        res.status(404).json({ error: 'Story is no longer pending.' })
        return
      }
      res.status(200).json({ ok: true })
      return
    }

    res.setHeader('Allow', 'GET, POST')
    res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    console.error('admin stories error', error)
    res.status(500).json({ error: 'Could not complete the moderation task.' })
  }
}
