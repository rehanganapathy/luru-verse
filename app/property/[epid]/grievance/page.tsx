import { notFound } from 'next/navigation'
import { getProperty, SEEDED_GRIEVANCES } from '@/lib/fixtures'
import { modelConfigured } from '@/lib/ai'
import { PropertyTabs } from '@/components/PropertyTabs'
import { GrievanceTab } from '@/components/GrievanceTab'
import { Footer } from '@/components/ui'

export default async function GrievancePage({
  params,
}: {
  params: Promise<{ epid: string }>
}) {
  const { epid } = await params
  const property = getProperty(decodeURIComponent(epid))
  if (!property) notFound()

  const seeded = SEEDED_GRIEVANCES.filter((g) => g.propertyEPID === property.ePID)

  return (
    <div className="stack stack-5">
      <PropertyTabs epid={property.ePID} />
      <GrievanceTab
        property={property}
        seeded={seeded}
        modelLive={modelConfigured()}
      />
      <Footer />
    </div>
  )
}
