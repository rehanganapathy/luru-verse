import { notFound } from 'next/navigation'
import { getProperty } from '@/lib/fixtures'
import { ClaimForm } from '@/components/ClaimForm'
import type { ServiceId } from '@/lib/types'

const VALID: ServiceId[] = ['bbmp-tax', 'bescom', 'bwssb']

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ epid: string }>
  searchParams: Promise<{ service?: string }>
}) {
  const { epid } = await params
  const { service } = await searchParams
  const property = getProperty(decodeURIComponent(epid))
  if (!property) notFound()
  if (!service || !VALID.includes(service as ServiceId)) notFound()

  return (
    <div className="stack stack-5">
      <ClaimForm property={property} serviceId={service as ServiceId} />
    </div>
  )
}
