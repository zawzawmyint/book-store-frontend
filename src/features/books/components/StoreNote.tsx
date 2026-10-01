import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent } from '../../../app/components/ui/card'

export function StoreNote() {
  return (
    <section className="page-shell mt-24">
      <Card className="border-0 bg-[#244b3b] text-[#f6f0e4]">
        <CardContent className="grid gap-8 p-8 pt-8 sm:p-12 sm:pt-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow eyebrow-light mb-3">A little more about this store</p>
            <h2 className="font-serif text-3xl sm:text-4xl">Good books. Clear ideas.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d3ded1]">
              Find your next read among our selected titles, from familiar classics to unexpected
              favorites.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            className="justify-start gap-3 p-0 text-xs font-bold uppercase tracking-[.16em] text-[#f3e6bf] hover:bg-transparent hover:underline"
          >
            <Link to="/cart">
              View your bag <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
