import { notFound } from 'next/navigation'
import { getProperty } from '@/lib/fixtures'
import { PropertyTabs } from '@/components/PropertyTabs'
import { ClaimForm } from '@/components/ClaimForm'
import { Footer } from '@/components/ui'
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
      <PropertyTabs epid={property.ePID} />
      <ClaimForm property={property} serviceId={service as ServiceId} />
      <Footer />
    </div>
  )
}
