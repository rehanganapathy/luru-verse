import { DeptView } from '@/components/DeptView'
import { Footer } from '@/components/ui'

export const metadata = {
  title: 'Ward 175 — department view — Luruverse',
}

export default function DeptPage() {
  return (
    <div className="col-wide stack stack-5 pane-in">
      <DeptView />
      <Footer />
    </div>
  )
}
