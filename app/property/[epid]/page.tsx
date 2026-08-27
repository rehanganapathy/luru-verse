import { notFound } from 'next/navigation'
import { getProperty } from '@/lib/fixtures'
import { ObjectCard } from '@/components/ObjectCard'

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ epid: string }>
}) {
  const { epid } = await params
  const property = getProperty(decodeURIComponent(epid))
  if (!property) notFound()

  return (
    <div className="stack stack-5">
      <ObjectCard property={property} />
    </div>
  )
}
