// Server-only. Two jobs, no more.
//
//   1. Grievance triage — free text in Kannada, Hinglish or English, resolved
//      to a department and a category. This is the "you never have to know
//      which department owns your problem" promise. It is genuinely hard
//      without a model: "ಚರಂಡಿ ತುಂಬಿ ಹರಿಯುತ್ತಿದೆ" and "drain overflowing" and
//      "gutter block ho gaya" all mean BWSSB, and no keyword list survives
//      contact with how people actually type.
//
//   2. Blocker explanation — turn a departmental rejection string into one
//      sentence a person understands and one thing they can do.
//
// Everything else in this app is deterministic code. A model that is bolted
// onto navigation, search or layout is obvious to anyone reviewing it.
//
// THE FALLBACK IS NOT DECORATION. If no key is configured, or the call fails,
// or it takes too long, a keyword classifier answers instead and the UI says
// so. A civic tool that goes down because an inference endpoint is slow is not
// a civic tool.

import 'server-only'
import type { ServiceId } from './types'

export type TriageResult = {
  serviceIds: ServiceId[]
  category: string
  /** One line, in the citizen's own framing, confirming what we understood. */
  restatement: string
  confidence: 'high' | 'low'
  source: 'model' | 'fallback'
}

export type ExplainResult = {
  sentence: string
  nextAction: string
  source: 'model' | 'fallback'
}

const TIMEOUT_MS = 7000

type Provider = { kind: 'openai' | 'anthropic'; key: string; model: string }

function provider(): Provider | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      kind: 'openai',
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-5',
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      kind: 'anthropic',
      key: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    }
  }
  return null
}

export function modelConfigured(): boolean {
  return provider() !== null
}

async function callModel(system: string, user: string): Promise<string | null> {
  const p = provider()
  if (!p) return null

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    if (p.kind === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${p.key}`,
        },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
        }),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json?.choices?.[0]?.message?.content ?? null
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': p.key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: user }],
        // No structured-output schema here on purpose: both prompts already
        // demand JSON, parseJson below is lenient, and every failure path
        // lands on the keyword classifier anyway.
        output_config: { effort: 'low' },
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const block = (json?.content ?? []).find(
      (b: { type: string }) => b.type === 'text',
    )
    return block?.text ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

// --- Triage -----------------------------------------------------------------

const TRIAGE_SYSTEM = `You route municipal complaints in Bengaluru to the right department.

Departments:
- bbmp-tax: BBMP property tax, khata records, assessment, ownership records, mutation.
- bescom: electricity supply, meters, billing, transformers, streetlights, power cuts.
- bwssb: water supply, sewage, drains, sanitary lines, water billing, borewell connections.

Input may be English, Kannada, Hindi, or a mix. Solid-waste, roads and potholes
belong to BBMP but not to the tax wing — for those, return bbmp-tax and set
confidence to "low", because our BBMP binding only covers the revenue desk.

Reply with JSON only:
{"serviceIds":["bwssb"],"category":"Sewage overflow","restatement":"Sewage is overflowing near your building.","confidence":"high"}

serviceIds may contain more than one department when the complaint genuinely
spans them. category is 3-4 words. restatement is one plain sentence in the
same language the citizen used, addressed to them as "you". Never invent
details the citizen did not give.`

const KEYWORDS: Array<{ id: ServiceId; category: string; words: string[] }> = [
  {
    id: 'bwssb',
    category: 'Water or sewage',
    words: [
      'water', 'sewage', 'sewerage', 'drain', 'drainage', 'gutter', 'manhole',
      'leak', 'tap', 'pipe', 'overflow', 'smell', 'sanitary', 'borewell',
      'neeru', 'chandri', 'charandi', 'ಚರಂಡಿ', 'ನೀರು', 'ಒಳಚರಂಡಿ', 'ಕೊಳಚೆ',
      'पानी', 'नाली', 'सीवर', 'paani', 'naali',
    ],
  },
  {
    id: 'bescom',
    category: 'Electricity supply',
    words: [
      'power', 'current', 'electric', 'electricity', 'meter', 'transformer',
      'voltage', 'streetlight', 'street light', 'wire', 'pole', 'shock',
      'outage', 'cut', 'tripping', 'bill unit',
      'ವಿದ್ಯುತ್', 'ಕರೆಂಟ್', 'ಮೀಟರ್', 'ಬೀದಿ ದೀಪ',
      'बिजली', 'करंट', 'मीटर', 'bijli', 'karent',
    ],
  },
  {
    id: 'bbmp-tax',
    category: 'Tax or khata record',
    words: [
      'khata', 'katha', 'tax', 'property tax', 'assessment', 'sas', 'epid',
      'mutation', 'record', 'name change', 'ownership',
      'ಖಾತಾ', 'ತೆರಿಗೆ', 'ಆಸ್ತಿ',
      'खाता', 'कर', 'टैक्स',
    ],
  },
]

function fallbackTriage(text: string): TriageResult {
  const t = text.toLowerCase()
  const scored = KEYWORDS.map((k) => ({
    k,
    score: k.words.reduce((n, w) => (t.includes(w.toLowerCase()) ? n + 1 : n), 0),
  })).sort((a, b) => b.score - a.score)

  const top = scored[0]
  if (!top || top.score === 0) {
    return {
      serviceIds: ['bbmp-tax'],
      category: 'Needs review',
      restatement:
        'We could not tell which department this belongs to. It has been sent to the BBMP ward office to be routed by a person.',
      confidence: 'low',
      source: 'fallback',
    }
  }
  return {
    serviceIds: [top.k.id],
    category: top.k.category,
    restatement: 'Filed as written. A person at the department will read it in full.',
    confidence: top.score > 1 ? 'high' : 'low',
    source: 'fallback',
  }
}

const VALID: ServiceId[] = ['bbmp-tax', 'bescom', 'bwssb']

export async function triageGrievance(
  text: string,
  lang: string,
): Promise<TriageResult> {
  if (!text.trim()) return fallbackTriage('')

  const raw = await callModel(
    TRIAGE_SYSTEM,
    `Citizen wrote (declared language: ${lang}):\n\n${text}`,
  )
  const parsed = parseJson<{
    serviceIds?: string[]
    category?: string
    restatement?: string
    confidence?: string
  }>(raw)

  const ids = (parsed?.serviceIds ?? []).filter((x): x is ServiceId =>
    VALID.includes(x as ServiceId),
  )
  if (!parsed || ids.length === 0) return fallbackTriage(text)

  return {
    serviceIds: ids,
    category: (parsed.category || 'Uncategorised').slice(0, 60),
    restatement: (parsed.restatement || '').slice(0, 300),
    confidence: parsed.confidence === 'high' ? 'high' : 'low',
    source: 'model',
  }
}

// --- Blocker explanation ----------------------------------------------------

const EXPLAIN_SYSTEM = `You rewrite Indian municipal rejection reasons for the
citizen who received them.

Reply with JSON only: {"sentence":"...","nextAction":"..."}

sentence: one sentence, under 25 words, saying what is actually wrong. No
apology, no "we regret", no "kindly", no "the concerned department". Do not
soften it and do not editorialise about the department.

nextAction: one imperative sentence naming the single concrete thing the
citizen does next. If it needs a document, name the document. If it needs
money, give the amount. If it needs a visit, say which office.

Never invent a rule, a fee, a form number, or a deadline that is not in the
input.`

export async function explainBlocker(
  departmentReason: string,
  context: string,
): Promise<ExplainResult> {
  const raw = await callModel(
    EXPLAIN_SYSTEM,
    `Department reason: ${departmentReason}\nContext: ${context}`,
  )
  const parsed = parseJson<{ sentence?: string; nextAction?: string }>(raw)
  if (!parsed?.sentence || !parsed?.nextAction) {
    return {
      sentence: departmentReason,
      nextAction:
        'Take the sale deed and the latest paid bill to the sub-division office.',
      source: 'fallback',
    }
  }
  return {
    sentence: parsed.sentence.slice(0, 240),
    nextAction: parsed.nextAction.slice(0, 240),
    source: 'model',
  }
}
