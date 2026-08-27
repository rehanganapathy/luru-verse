import { DeptView } from '@/components/DeptView'
import { Footer } from '@/components/ui'

export const metadata = {
  title: 'Ward 175 — department view — Handover',
}

export default function DeptPage() {
  return (
    <div className="stack stack-5">
      <DeptView />
      <Footer />
    </div>
  )
}
