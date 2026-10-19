import { t, useI18n } from '../../../lib/i18n'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent } from '../../../app/components/ui/card'

export function StoreNote() {
  useI18n()

  return (
    <section className="page-shell mt-14">
      <Card className="border-0 bg-[#244b3b] text-[#f6f0e4]">
        <CardContent className="grid gap-6 p-7 pt-7 sm:px-10 sm:py-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow eyebrow-light mb-3">
              {t('storefront:aLittleMoreAboutThisStore')}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl">
              {t('storefront:goodBooksClearIdeas')}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d3ded1]">
              {t('storefront:findYourNextReadAmongOurSelectedTitlesFromFamiliarClassics')}
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            className="justify-start gap-3 p-0 text-xs font-bold uppercase tracking-[.16em] text-[#f3e6bf] hover:bg-transparent hover:underline"
          >
            <Link to="/books">
              {t('storefront:findYourNextRead')} <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
