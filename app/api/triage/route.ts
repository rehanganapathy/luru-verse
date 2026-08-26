import { NextResponse } from 'next/server'
import { triageGrievance } from '@/lib/ai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { text?: string; lang?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const text = (body.text ?? '').slice(0, 2000)
  const lang = body.lang === 'kn' || body.lang === 'hi' ? body.lang : 'en'

  // Nothing is logged. The complaint text is not persisted server-side; it
  // goes to the classifier and the result comes back to the device.
  const result = await triageGrievance(text, lang)
  return NextResponse.json(result)
}
