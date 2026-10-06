import { AccountProfile } from '../AccountProfile'
import { PageContainer } from '../../../app/components/PageContainer'

export function ProfilePage() {
  return (
    <PageContainer className="mx-auto max-w-xl py-12 sm:py-20">
      <p className="eyebrow mb-3">Your account</p>
      <h1 className="font-serif text-5xl">Your profile</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Earlier order requests keep the name they were placed with.
      </p>
      <AccountProfile tone="store" />
    </PageContainer>
  )
}
