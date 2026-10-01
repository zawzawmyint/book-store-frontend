import { ArrowRight, Sparkles } from 'lucide-react'
import { PageContainer } from '../../../app/components/PageContainer'
import { BookCover } from './BookCover'
import { Button } from '../../../app/components/ui/button'

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-[#e7e9df]">
      <PageContainer className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20 lg:py-24">
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#557760]">
            <Sparkles size={15} /> Curated for curious minds
          </p>
          <h1 className="font-serif text-[clamp(3.5rem,6vw,6.4rem)] leading-[.96] tracking-[-.055em] text-[#233a2e]">
            Find your next <em className="font-normal text-[#9b714f]">chapter.</em>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#5f6d62]">
            Thoughtful stories for slow mornings, long journeys, and everywhere in between. Take a
            look around.
          </p>
          <Button asChild className="mt-9 rounded-sm">
            <a href="#collection">
              Explore the collection <ArrowRight size={17} />
            </a>
          </Button>
        </div>
        <div className="relative mx-auto flex h-[340px] w-full max-w-[520px] items-center justify-center sm:h-[430px]">
          <div className="absolute right-[12%] top-[9%] h-[79%] w-[45%] rotate-[13deg] opacity-85">
            <BookCover id="2" title="Pride and Prejudice" author="Jane Austen" />
          </div>
          <div className="absolute left-[10%] top-[12%] h-[79%] w-[45%] -rotate-[12deg] opacity-90">
            <BookCover id="4" title="Jane Eyre" author="Charlotte Brontë" />
          </div>
          <div className="absolute left-[29%] top-[3%] h-[86%] w-[45%] rotate-[-1deg] drop-shadow-2xl">
            <BookCover id="1" title="The Great Gatsby" author="F. Scott Fitzgerald" />
          </div>
          <div className="absolute bottom-0 left-[20%] right-[10%] h-4 rounded-[50%] bg-[#748375]/20 blur-xl" />
        </div>
      </PageContainer>
      <span
        className="absolute -bottom-24 -left-24 size-72 rounded-full border-[55px] border-white/20"
        aria-hidden="true"
      />
    </section>
  )
}
