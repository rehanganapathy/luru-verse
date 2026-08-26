import { NextResponse } from 'next/server'
import { explainBlocker } from '@/lib/ai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { reason?: string; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }
  const result = await explainBlocker(
    (body.reason ?? '').slice(0, 800),
    (body.context ?? '').slice(0, 400),
  )
  return NextResponse.json(result)
}
