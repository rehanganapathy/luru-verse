import { notFound } from 'next/navigation'
import { getBeat, getProperty, SEEDED_GRIEVANCES } from '@/lib/fixtures'
import { GarbageTracker } from '@/components/GarbageTracker'

export default async function GarbagePage({
  params,
}: {
  params: Promise<{ epid: string }>
}) {
  const { epid } = await params
  const property = getProperty(decodeURIComponent(epid))
  if (!property) notFound()

  const beat = getBeat(property.ePID)
  if (!beat) notFound()

  // The seeded threads go in so an escalation from the log can APPEND to a
  // complaint that already exists on this address — including one the previous
  // owner opened — instead of quietly starting the clock again.
  const seeded = SEEDED_GRIEVANCES.filter((g) => g.propertyEPID === property.ePID)

  return (
    <div className="stack stack-5">
      <GarbageTracker property={property} beat={beat} seeded={seeded} />
    </div>
  )
}
