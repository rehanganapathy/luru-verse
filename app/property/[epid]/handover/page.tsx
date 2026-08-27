import { notFound } from 'next/navigation'
import { getProperty } from '@/lib/fixtures'
import { Handover } from '@/components/Handover'

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
      <Handover property={property} />
    </div>
  )
}
