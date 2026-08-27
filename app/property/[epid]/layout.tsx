import { notFound } from 'next/navigation'
import { getProperty, SEEDED_GRIEVANCES } from '@/lib/fixtures'
import { PropertyShell } from '@/components/PropertyShell'
import { Footer } from '@/components/ui'

/**
 * One layout for every view of a property, so the rail is mounted once and
 * survives navigation between them instead of being torn down and rebuilt by
 * each page. That is what makes a tab switch feel like a pane change rather
 * than a page load.
 */
export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ epid: string }>
}) {
  const { epid } = await params
  const property = getProperty(decodeURIComponent(epid))
  if (!property) notFound()

  const seededGrievanceCount = SEEDED_GRIEVANCES.filter(
    (g) => g.propertyEPID === property.ePID,
  ).length

  return (
    <>
      <PropertyShell property={property} seededGrievanceCount={seededGrievanceCount}>
        {children}
      </PropertyShell>
      <Footer />
    </>
  )
}
