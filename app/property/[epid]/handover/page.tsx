import { notFound } from 'next/navigation'
import { getProperty } from '@/lib/fixtures'
import { PropertyTabs } from '@/components/PropertyTabs'
import { Handover } from '@/components/Handover'
import { Footer } from '@/components/ui'

export default async function HandoverPage({
  params,
}: {
  params: Promise<{ epid: string }>
}) {
  const { epid } = await params
  const property = getProperty(decodeURIComponent(epid))
  if (!property) notFound()

  return (
    <div className="stack stack-5">
      <PropertyTabs epid={property.ePID} />
      <Handover property={property} />
      <Footer />
    </div>
  )
}
