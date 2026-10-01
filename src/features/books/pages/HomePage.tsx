import { HomeHero } from '../components/HomeHero'
import { CatalogSection } from '../components/CatalogSection'
import { StoreNote } from '../components/StoreNote'

export function HomePage() {
  return (
    <>
      <HomeHero />
      <CatalogSection />
      <StoreNote />
    </>
  )
}
